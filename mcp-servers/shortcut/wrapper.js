#!/usr/bin/env node
// shortcut-mcp-wrapper
//
// Sits between Claude Code's MCP transport and @shortcut/mcp.
//
// Two transforms:
//   1. Claude Code stringifies integer arguments when forwarding to MCP tools,
//      but @shortcut/mcp uses strict zod z.number() validation and rejects
//      strings. We intercept every `tools/call` request and coerce all
//      numeric-looking string arguments to numbers.
//   2. macOS + Node 18+ uses `verbatim` DNS ordering, which sometimes returns
//      AAAA (IPv6) first and surfaces ENOTFOUND before falling back to A
//      (IPv4). We force the spawned child to use IPv4-first via NODE_OPTIONS,
//      AND we add a one-shot retry: if a response carries an ENOTFOUND or
//      ETIMEDOUT error, we replay the original request once. This kills the
//      intermittent "Shortcut returned DNS error" failures during ticket
//      investigations.
//
// Responses with no error pass through unchanged.

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const NUMERIC_PARAM_NAMES = new Set([
  'storyPublicId',
  'taskPublicId',
  'epicPublicId',
  'iterationPublicId',
  'objectivePublicId',
  'projectPublicId',
  'workflowPublicId',
  'documentPublicId',
  'labelPublicId',
  'teamPublicId',
  'id',
  'estimate',
  'pr',
  'project',
  'epic',
  'objective',
]);

function coerceNumericValues(args) {
  if (args == null || typeof args !== 'object') return args;
  const out = Array.isArray(args) ? [] : {};
  for (const key of Object.keys(args)) {
    const v = args[key];
    if (typeof v === 'string' && NUMERIC_PARAM_NAMES.has(key) && /^-?\d+$/.test(v)) {
      out[key] = Number(v);
    } else if (v && typeof v === 'object') {
      out[key] = coerceNumericValues(v);
    } else {
      out[key] = v;
    }
  }
  return out;
}

// DNS hardening for the child:
//   - ipv4first dodges macOS's AAAA-first ordering flake.
//   - dns-resilient.cjs (preloaded via --require) caches lookups, retries
//     transient getaddrinfo failures, and falls back to a c-ares resolver on
//     public DNS. This is the real fix for the intermittent ENOTFOUND, since
//     the OS resolves the host fine and the failure is inside Node.
//   - A larger libuv threadpool keeps concurrent getaddrinfo calls from
//     starving each other during bursty investigations.
const dnsPreload = fileURLToPath(new URL('./dns-resilient.cjs', import.meta.url));
const childEnv = {
  ...process.env,
  UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || '64',
  NODE_OPTIONS: [process.env.NODE_OPTIONS || '', '--dns-result-order=ipv4first', `--require ${dnsPreload}`]
    .filter(Boolean)
    .join(' '),
};

const child = spawn('npx', ['-y', '@shortcut/mcp@latest'], {
  env: childEnv,
  stdio: ['pipe', 'pipe', 'inherit'],
});

// Track in-flight requests so we can replay them on transient DNS errors.
// Belt-and-suspenders behind the DNS preload: if a transient error still makes
// it back as a JSON-RPC error, replay the request up to MAX_REPLAYS times with
// increasing backoff before giving up.
const inFlight = new Map(); // id -> { rawLine, attempts }
const MAX_REPLAYS = 3;

function isTransientNetworkError(msg) {
  if (!msg || !msg.error) return false;
  const text = JSON.stringify(msg.error);
  return /ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|getaddrinfo/i.test(text);
}

const upstreamRl = createInterface({ input: child.stdout });
upstreamRl.on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stdout.write(line + '\n');
    return;
  }

  // If this looks like a response to an in-flight call, check for retry.
  if (msg && msg.id != null && inFlight.has(msg.id)) {
    const tracked = inFlight.get(msg.id);
    if (isTransientNetworkError(msg) && tracked.attempts < MAX_REPLAYS) {
      tracked.attempts += 1;
      // Increasing backoff so we don't hammer a momentarily-flaky resolver.
      const backoff = 250 * tracked.attempts;
      setTimeout(() => {
        child.stdin.write(tracked.rawLine + '\n');
      }, backoff);
      return;
    }
    inFlight.delete(msg.id);
  }

  process.stdout.write(line + '\n');
});

const downstreamRl = createInterface({ input: process.stdin });
downstreamRl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (
      msg &&
      msg.method === 'tools/call' &&
      msg.params &&
      msg.params.arguments
    ) {
      msg.params.arguments = coerceNumericValues(msg.params.arguments);
    }
    const outLine = JSON.stringify(msg);
    // Track this request for possible replay on transient DNS errors.
    if (msg && msg.id != null && msg.method === 'tools/call') {
      inFlight.set(msg.id, { rawLine: outLine, attempts: 0 });
    }
    child.stdin.write(outLine + '\n');
  } catch {
    // Pass non-JSON through unchanged.
    child.stdin.write(line + '\n');
  }
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
