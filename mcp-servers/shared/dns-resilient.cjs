'use strict';
// Resilient DNS preload for the Shortcut MCP child process.
//
// Root cause this fixes: the OS resolves api.app.shortcut.com fine (dig, host,
// curl all succeed), but the Node process intermittently throws
// `getaddrinfo ENOTFOUND` / `EAI_AGAIN`. That is the libuv-threadpool
// getaddrinfo path flaking under load or on a momentary resolver hiccup.
// Forcing ipv4first does not fix an intermittent resolver failure.
//
// Fix: replace dns.lookup (the call net/undici use for every connection) with a
// resilient version that
//   1. serves from a short in-memory cache, so a one-off hiccup reuses the last
//      good answer,
//   2. retries transient failures a few times with backoff,
//   3. falls back to a c-ares resolver (dns.resolve4/6) pinned to public DNS
//      (1.1.1.1, 8.8.8.8) when getaddrinfo keeps failing,
//   4. as a last resort serves a stale cache entry rather than erroring.
//
// Loaded via NODE_OPTIONS=--require before @shortcut/mcp, so the patch is in
// place before any HTTP client reads dns.lookup.

const dns = require('node:dns');
const origLookup = dns.lookup.bind(dns);
const { Resolver } = dns;

const fallbackResolver = new Resolver();
try {
  fallbackResolver.setServers(['1.1.1.1', '8.8.8.8']);
} catch {
  // keep system servers if setServers is unavailable
}

const TTL_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 4;
const TRANSIENT = /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ESERVFAIL|ETIMEOUT/;

const cache = new Map(); // `${hostname}|${family}` -> { records, expires, hardExpires }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function caresFallback(hostname, family) {
  const resolveWith = (method, fam) =>
    new Promise((resolve) => {
      fallbackResolver[method](hostname, (err, addrs) => {
        if (err || !addrs || !addrs.length) return resolve([]);
        resolve(addrs.map((address) => ({ address, family: fam })));
      });
    });
  if (family === 6) return resolveWith('resolve6', 6);
  return resolveWith('resolve4', 4).then((v4) => (v4.length ? v4 : resolveWith('resolve6', 6)));
}

function normalizeArgs(args) {
  const hostname = args[0];
  let options = args[1];
  let callback = args[2];
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (typeof options === 'number') options = { family: options };
  return { hostname, options: options || {}, callback };
}

function deliver(records, all, callback) {
  if (all) return callback(null, records);
  return callback(null, records[0].address, records[0].family);
}

async function resilientLookup(hostname, options, callback) {
  const family = options.family || 0;
  const all = !!options.all;
  const key = `${hostname}|${family}`;
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now() && cached.records.length) {
    return deliver(cached.records, all, callback);
  }

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const records = await new Promise((resolve, reject) => {
        origLookup(hostname, { ...options, all: true }, (err, addresses) => {
          if (err) return reject(err);
          resolve(addresses);
        });
      });
      if (records && records.length) {
        cache.set(key, { records, expires: Date.now() + TTL_MS, hardExpires: Date.now() + STALE_MS });
        return deliver(records, all, callback);
      }
      lastErr = new Error('empty lookup result');
    } catch (err) {
      lastErr = err;
      if (!TRANSIENT.test(String(err && err.code))) break;
    }
    await sleep(100 * attempt);
  }

  try {
    const records = await caresFallback(hostname, family);
    if (records.length) {
      cache.set(key, { records, expires: Date.now() + TTL_MS, hardExpires: Date.now() + STALE_MS });
      return deliver(records, all, callback);
    }
  } catch {
    // fall through
  }

  if (cached && cached.hardExpires > Date.now() && cached.records.length) {
    return deliver(cached.records, all, callback);
  }
  return callback(lastErr || Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' }));
}

dns.lookup = function patchedLookup(...args) {
  const { hostname, options, callback } = normalizeArgs(args);
  if (typeof callback !== 'function') return origLookup(...args);
  resilientLookup(hostname, options, callback).catch((e) => callback(e));
};

if (dns.promises && dns.promises.lookup) {
  dns.promises.lookup = function (hostname, options) {
    const opts = typeof options === 'number' ? { family: options } : { ...(options || {}) };
    return new Promise((resolve, reject) => {
      resilientLookup(hostname, opts, (err, address, fam) => {
        if (err) return reject(err);
        if (opts.all) return resolve(address);
        resolve({ address, family: fam });
      });
    });
  };
}
