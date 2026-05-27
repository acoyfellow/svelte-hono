// svelte-hono: render Svelte 5 components inside a Hono Worker.
//
// Pattern modeled on Hono's own helpers (`jsxRenderer`, `serveStatic`,
// `logger`): a small factory that returns a `MiddlewareHandler`. Svelte
// components are imported normally — at build time, esbuild + esbuild-svelte
// produce SSR + client modules. No `eval`, no `new Function`, no V8
// codegen prohibition issues on Cloudflare Workers.
//
// Usage:
//
//   import { Hono } from "hono";
//   import { svelteRenderer, attachSvelteRoutes } from "svelte-hono";
//   import Hello from "./hello.svelte";
//   import HelloClient from "./hello.svelte?client";
//
//   const app = new Hono();
//
//   attachSvelteRoutes(app, {
//     // Map hash -> client bundle source. The build script generates this.
//     bundles: {
//       hello: { js: HelloClient.js, css: HelloClient.css },
//     },
//   });
//
//   app.get("/", svelteRenderer(Hello, { hydrateAs: "hello", title: "Hello" }));
//
// The companion build script (examples/hello/build.mjs) is what produces
// the `?client` artifacts. The adapter itself stays tiny and runtime-only.

import type { Hono, MiddlewareHandler } from "hono";
import { render as svelteRender } from "svelte/server";

export interface SvelteRendererOptions {
  /** Stable id (hash, slug, anything) that picks the matching client bundle
   *  registered via `attachSvelteRoutes({ bundles })`. */
  hydrateAs: string;
  /** Props passed to the component during SSR and hydration. */
  props?: Record<string, unknown>;
  /** Page title. */
  title?: string;
  /** Extra `<head>` content (meta tags, fonts, links). */
  head?: string;
  /** Body class string. */
  bodyClass?: string;
  /**
   * Cache-Control header for the SSR'd HTML response.
   *
   * Default: `"public, max-age=0, must-revalidate"` — deploy-safe.
   * Browsers store the response but always revalidate before using it, and
   * Cloudflare's edge does not cache it. New deploys are visible on the
   * next request, everywhere.
   *
   * Override examples:
   *   - `"public, max-age=60, s-maxage=300"` — dedupe spikes by ~5min.
   *   - `"private, max-age=0"` — per-user responses, no shared caching.
   *   - `false` — omit the Cache-Control header entirely.
   *
   * SSR is fast (<5ms typical). Caching the HTML buys little speed but
   * costs staleness on deploy. If you want edge caching, opt in.
   */
  cacheControl?: string | false;
}

export interface ClientBundle {
  /** ES module source for the client-side hydratable component. */
  js: string;
  /** Scoped CSS extracted from the component. Empty string if none. */
  css: string;
  /**
   * Short content hash (e.g. 8 hex chars) of `js + css`. Emitted by
   * `svelte-hono/build`. When present, the served URL becomes
   * `/{prefix}/{id}.{hash}.js` so a new deploy produces a new URL — the
   * previous URL never collides with the new bytes. This is what makes
   * `cache-control: immutable` on the JS/CSS safe.
   *
   * Backwards compatible: if `hash` is missing, the URL is `/{prefix}/{id}.js`
   * and the response sets a short, revalidating Cache-Control instead.
   */
  hash?: string;
}

export interface AttachSvelteRoutesOptions {
  /** Pre-built client bundles, keyed by the same id used in `hydrateAs`. */
  bundles: Record<string, ClientBundle>;
  /** Mount prefix for compiled artifact routes. Defaults to "/__svelte". */
  prefix?: string;
}

const TAG = "__hono_svelte_mounted__";

let registeredBundles: Record<string, ClientBundle> = {};
let mountPrefix = "/__svelte";

/** Resolve the public asset filename (without extension) for a bundle id. */
function assetBaseFor(id: string): string {
  const b = registeredBundles[id];
  if (b && b.hash) return `${id}.${b.hash}`;
  return id;
}

/**
 * Register the routes that serve compiled Svelte artifacts.
 *
 * Must be called once on the Hono app instance, before any
 * `svelteRenderer(...)` handlers run. Idempotent per app instance.
 */
export function attachSvelteRoutes(
  app: Hono,
  options: AttachSvelteRoutesOptions,
): void {
  registeredBundles = options.bundles;
  mountPrefix = options.prefix ?? "/__svelte";

  const tagged = app as unknown as Record<string, boolean>;
  if (tagged[TAG]) return;
  tagged[TAG] = true;

  app.get(`${mountPrefix}/:filename`, async (c) => {
    const filename = c.req.param("filename");
    // Two URL shapes are accepted:
    //   {id}.{hash}.{js|css}  — content-addressed, safe to cache forever.
    //   {id}.{js|css}         — legacy/no-hash, MUST NOT be cached forever.
    //
    // Anything else is a 404. Note the hash segment is hex-ish; we accept
    // any 6+ alphanumeric token so users can plug in their own hashing.
    const hashed = filename.match(/^([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9]{6,})\.(js|css)$/);
    const plain = hashed ? null : filename.match(/^([a-zA-Z0-9_\-]+)\.(js|css)$/);
    if (!hashed && !plain) return c.notFound();

    const id = hashed ? hashed[1] : plain![1];
    const requestedHash = hashed ? hashed[2] : null;
    const ext = hashed ? hashed[3] : plain![2];

    const bundle = registeredBundles[id];
    if (!bundle) return c.notFound();

    // If the URL claims a hash, it must match the bundle's current hash.
    // Otherwise a stale HTML page (somehow) referencing an old hash would
    // be served fresh bytes under the wrong URL — return 404 instead so
    // the browser surfaces the problem instead of silently misloading.
    if (requestedHash && bundle.hash && requestedHash !== bundle.hash) {
      return c.notFound();
    }

    // Cache strategy:
    //   - Hashed URLs: immutable. Safe because URL changes on every deploy.
    //     We also write into caches.default so subsequent requests skip the
    //     Worker entirely.
    //   - Plain URLs (no hash available): short max-age + must-revalidate.
    //     We do NOT write to caches.default — a deploy must be able to
    //     replace these bytes within seconds.
    const immutable = Boolean(requestedHash && bundle.hash);
    const cacheControl = immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate";

    const cache = immutable
      ? (globalThis as unknown as { caches?: { default: Cache } }).caches?.default
      : undefined;
    if (cache) {
      const hit = await cache.match(c.req.raw);
      if (hit) return hit;
    }

    const response = ext === "js"
      ? new Response(bundle.js, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": cacheControl,
          },
        })
      : new Response(bundle.css, {
          headers: {
            "content-type": "text/css; charset=utf-8",
            "cache-control": cacheControl,
          },
        });

    if (cache) {
      c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
    }
    return response;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Reserved bundle id for the shared Svelte runtime. */
const RUNTIME_ID = "_runtime";

function runtimeUrl(): string | null {
  const r = registeredBundles[RUNTIME_ID];
  if (!r) return null;
  const base = r.hash ? `${RUNTIME_ID}.${r.hash}` : RUNTIME_ID;
  return `${mountPrefix}/${base}.js`;
}

function shell(
  rendered: { body: string; head: string },
  bundleId: string,
  hasCss: boolean,
  opts: SvelteRendererOptions,
): string {
  // Hashed URLs guarantee browsers fetch fresh bytes on every deploy while
  // still letting Cloudflare and the browser cache them forever between
  // deploys. The hash is resolved at render time from the registry — so
  // the worker can be re-deployed without rebuilding the HTML manually.
  const base = assetBaseFor(bundleId);
  const cssLink = hasCss ? `<link rel="stylesheet" href="${mountPrefix}/${base}.css">` : "";
  const title = opts.title ? `<title>${escapeHtml(opts.title)}</title>` : "";
  const extraHead = opts.head ?? "";
  const bodyClass = opts.bodyClass ? ` class="${escapeHtml(opts.bodyClass)}"` : "";
  const propsJson = JSON.stringify(opts.props ?? {});

  // Shared-runtime path:
  //   - The build emits a single _runtime bundle containing svelte's client
  //     runtime + disclose-version side-effect + the user-facing `svelte`
  //     exports (hydrate, mount, unmount).
  //   - Per-component bundles are built with those modules `external`, so
  //     they're ~1-3 KB each instead of ~45 KB.
  //   - An import map in this shell points the bare specifiers the component
  //     bundles still mention (`svelte`, `svelte/internal/client`, etc.) at
  //     the runtime URL.
  //   - A modulepreload hint primes the runtime fetch in parallel with the
  //     component fetch, so hydration starts as soon as the page parses.
  //
  // If the build didn't emit a runtime entry (legacy / opted-out), fall back
  // to the old self-contained per-component shape: no import map, the bundle
  // ships its own runtime.
  const runtime = runtimeUrl();
  const importMap = runtime ? `<script type="importmap">${JSON.stringify({
    imports: {
      "svelte": runtime,
      "svelte/internal/client": runtime,
      "svelte/internal/disclose-version": runtime,
    },
  })}</script>` : "";
  const runtimePreload = runtime ? `<link rel="modulepreload" href="${runtime}">` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${title}
${importMap}
${runtimePreload}
${cssLink}
${extraHead}
${rendered.head}
</head>
<body${bodyClass}>
<div id="svelte-hono-root">${rendered.body}</div>
<script type="module">
import { hydrate } from "${mountPrefix}/${base}.js";
hydrate(${propsJson});
</script>
</body>
</html>`;
}

/**
 * Returns a Hono middleware that responds with an HTML document rendered
 * from a built Svelte component. The component must be a Svelte 5
 * component imported normally (SSR build); the matching client bundle
 * must be registered via `attachSvelteRoutes`.
 */
export function svelteRenderer<Props extends Record<string, unknown> = Record<string, unknown>>(
  // The SSR build of `*.svelte` is a function with svelte/server's render
  // signature; types are loose because the esbuild-svelte loader emits a
  // raw value rather than a typed module.
  component: unknown,
  options: SvelteRendererOptions,
): MiddlewareHandler {
  return async (c) => {
    // HTML is intentionally NOT written to caches.default by default. Deploys
    // need to be visible immediately. Cache-Control: max-age=0, must-revalidate
    // means browsers store the response but always revalidate before using it,
    // and Cloudflare's edge does not cache it.
    //
    // Users who explicitly opt into edge caching by passing a non-default
    // `cacheControl` with `s-maxage=...` get Cloudflare-level caching for free
    // via the response header alone — no Cache API write needed.
    const props = (options.props ?? {}) as Props;
    const out = svelteRender(component as never, { props: props as never });
    const html = shell({ body: out.body, head: out.head }, options.hydrateAs, true, options);

    const cc = options.cacheControl ?? "public, max-age=0, must-revalidate";
    const headers: Record<string, string> = {
      "content-type": "text/html; charset=utf-8",
    };
    if (cc) headers["cache-control"] = cc;
    return new Response(html, { status: 200, headers });
  };
}
