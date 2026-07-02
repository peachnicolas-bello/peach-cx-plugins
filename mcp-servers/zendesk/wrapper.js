#!/usr/bin/env node
// zendesk-mcp-wrapper
//
// Sits between Claude Code's MCP transport and zd-mcp-server.
// Strips bloat fields (custom_fields, fields, via.source, attachment thumbnails)
// from ticket responses so keyword searches that match dozens of tickets fit
// inside the MCP response cap. Requests pass through unchanged.

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// Fields to drop from each ticket object in responses.
// These are huge (custom_fields/fields are 18+ entries each, mostly nulls)
// and rarely useful for triage. Kept minimal so we don't accidentally hide
// something CX needs.
const BLOAT_KEYS = new Set([
  'custom_fields',
  'fields',
  'sharing_agreement_ids',
  'followup_ids',
]);

function stripTicket(ticket) {
  if (ticket == null || typeof ticket !== 'object') return ticket;
  const out = {};
  for (const k of Object.keys(ticket)) {
    if (BLOAT_KEYS.has(k)) continue;
    if (k === 'via' && ticket.via && ticket.via.source) {
      // Keep channel, drop the empty from/to/rel sub-object
      out.via = { channel: ticket.via.channel };
      continue;
    }
    out[k] = ticket[k];
  }
  return out;
}

function stripTextPayload(text) {
  // Responses often wrap a JSON-stringified array of tickets in a content block.
  // Try to parse, strip each ticket, re-stringify. If anything fails, pass through.
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map(stripTicket), null, 2);
    }
    if (parsed && typeof parsed === 'object' && parsed.ticket) {
      // Single-ticket response (get_ticket_details)
      const stripped = { ...parsed, ticket: stripTicket(parsed.ticket) };
      return JSON.stringify(stripped, null, 2);
    }
    return text;
  } catch {
    return text;
  }
}

function stripResponse(msg) {
  // Only touch tools/call responses with content
  const result = msg && msg.result;
  if (!result || !Array.isArray(result.content)) return msg;
  result.content = result.content.map((block) => {
    if (block && block.type === 'text' && typeof block.text === 'string') {
      return { ...block, text: stripTextPayload(block.text) };
    }
    return block;
  });
  return msg;
}

// Preload dns-resilient.cjs into the child process. This patches dns.lookup to
// cache successful lookups, retry transient ENOTFOUND/EAI_AGAIN failures with
// backoff, and fall back to a c-ares resolver pinned to public DNS (1.1.1.1,
// 8.8.8.8). Also force IPv4-first ordering. Same fix as the Shortcut wrapper.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dnsPreload = join(__dirname, 'dns-resilient.cjs');

const childEnv = {
  ...process.env,
  NODE_OPTIONS: [
    process.env.NODE_OPTIONS || '',
    `--require=${dnsPreload}`,
    '--dns-result-order=ipv4first',
  ]
    .filter(Boolean)
    .join(' '),
  UV_THREADPOOL_SIZE: '8',
};

const child = spawn('npx', ['-y', 'zd-mcp-server'], {
  env: childEnv,
  stdio: ['pipe', 'pipe', 'inherit'],
});

const upstreamRl = createInterface({ input: child.stdout });
upstreamRl.on('line', (line) => {
  if (!line.trim()) {
    process.stdout.write(line + '\n');
    return;
  }
  try {
    const msg = JSON.parse(line);
    const cleaned = stripResponse(msg);
    process.stdout.write(JSON.stringify(cleaned) + '\n');
  } catch {
    process.stdout.write(line + '\n');
  }
});

const downstreamRl = createInterface({ input: process.stdin });
downstreamRl.on('line', (line) => {
  child.stdin.write(line + '\n');
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
