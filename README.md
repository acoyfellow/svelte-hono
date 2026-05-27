# svelte-hono

[![npm version](https://img.shields.io/npm/v/svelte-hono.svg)](https://www.npmjs.com/package/svelte-hono)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/acoyfellow/svelte-hono)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Drop a `.svelte` file in a Hono Worker. Real SSR. Real hydration. No SvelteKit.

- **npm:** <https://www.npmjs.com/package/svelte-hono>
- **docs:** <https://svelte-hono.coey.dev>
- **repo:** <https://github.com/acoyfellow/svelte-hono>

```ts
import { Hono } from "hono";
import { svelteRenderer, attachSvelteRoutes } from "svelte-hono";
import { bundles } from "./bundles.generated";
import Hello from "./hello.svelte";

const app = new Hono();
attachSvelteRoutes(app, { bundles });

app.get("/", svelteRenderer(Hello, {
  hydrateAs: "hello",
  title: "Hello",
  props: { initialCount: 0 },
}));

export default app;
```

That's the whole worker. `bundles.generated.ts` is written for you by `svelte-hono/build` — it's a normal ES module the worker imports, no globals, no `define` magic.

## What it does

- Compiles your `.svelte` files at build time (esbuild + esbuild-svelte).
- Server-renders Svelte 5 components on the Worker — real HTML, instant first paint.
- Hydrates on the client — `$state`, `$effect`, event handlers, all of it.
- **Shared runtime by default.** Svelte's ~103 KB client runtime ships as a single `/__svelte/_runtime.<hash>.js` file across every component on your site. Per-component bundles are typically 1–16 KB instead of 45–70 KB. After the first page in a session, every subsequent component is a small download.
- Static bundles are **content-hashed** at build time and cached for a year on Cloudflare's edge — new deploy = new hash = new URL = guaranteed cache miss. No purging, no `?v=` query strings, no stale hydration scripts after a deploy. HTML defaults to revalidate-on-every-request so deploys are visible immediately; opt into edge HTML caching via `cacheControl`.
- Stays out of your way. Hono owns routing. You own the rest.
- No `eval`, no `new Function`, no Workers codegen prohibition to dodge.

## Install

```bash
npm i svelte-hono hono svelte
npm i -D esbuild esbuild-svelte wrangler
```

## Quickstart

1. **A component** — `hello.svelte`:

   ```svelte
   <script>
     let { initialCount = 0 } = $props();
     let count = $state(0);
     $effect(() => { count = initialCount; });
   </script>
   <button onclick={() => count += 1}>clicks: {count}</button>
   ```

2. **A worker** — `worker.ts` (as above).

3. **A build script** — `build.mjs`:

   ```ts
   import { buildHonoSvelte } from "svelte-hono/build";

   await buildHonoSvelte({
     workerEntry: "./worker.ts",
     outDir: "./build",
     components: { hello: "./hello.svelte" },
   });
   ```

4. **A wrangler config** — `wrangler.toml`:

   ```toml
   name = "my-app"
   main = "build/worker.bundled.mjs"
   compatibility_date = "2026-04-21"
   compatibility_flags = ["nodejs_compat"]

   [build]
   command = "node build.mjs"
   ```

5. **Add to `.gitignore`**:

   ```
   bundles.generated.ts
   build/
   ```

6. **Run it**:

   ```bash
   npx wrangler dev
   ```

   Click the button. Counter goes up. You just rendered Svelte 5 on a Worker.

## Examples in this repo

```bash
git clone https://github.com/acoyfellow/svelte-hono
cd svelte-hono
npm install && npm run build

# minimal counter
cd examples/hello && node build.mjs && npx wrangler dev

# full docs site (5 pages, multi-route, OG image, sitemap, edge-cached)
cd examples/docs && node build.mjs && npx wrangler dev
```

The `examples/docs/` site is the live docs at svelte-hono.coey.dev. The site is built with svelte-hono itself — the same primitive you're reading about.

## Caching

The whole problem with shipping a hydration script under a stable URL is that browsers and Cloudflare will happily serve the old bytes after you deploy. svelte-hono sidesteps this by content-hashing every client bundle:

| URL | Cache-Control | Who serves it |
|---|---|---|
| `GET /` (HTML) | `public, max-age=0, must-revalidate` (default) | Worker, every request |
| `GET /__svelte/{id}.{hash}.js` | `public, max-age=31536000, immutable` | Cloudflare edge cache, indefinitely |
| `GET /__svelte/{id}.{hash}.css` | `public, max-age=31536000, immutable` | Cloudflare edge cache, indefinitely |

What this buys you:

- **Deploy and walk away.** New build → new hash → new URL. The HTML is fresh, references the new URL, browsers fetch fresh JS. The old URL is left behind in caches — nothing points at it, no harm done.
- **No cache purging.** You never need to call the Cloudflare cache API or bust anything manually.
- **Hash mismatch → 404.** If a request comes in for `home.deadbeef.js` and the current bundle has a different hash, the Worker returns 404 instead of silently serving the wrong bytes. Stale references fail loud.
- **HTML caching is opt-in.** Set `cacheControl: "public, max-age=60, s-maxage=300"` on `svelteRenderer` to let Cloudflare cache the HTML too. Hashed asset URLs in the HTML mean even cached HTML is safe — it'll request the right JS as long as the HTML itself is still valid.

If you upgrade from a pre-hash version of svelte-hono, the legacy unhashed URL (`/__svelte/home.js`) still works, but is served with `max-age=0, must-revalidate` rather than `immutable` — because without a hash there's no way to make caching it safe.

## Comparison

|  | svelte-hono | SvelteKit + adapter-cloudflare | hono/jsx |
|---|---|---|---|
| Routing | Hono | SvelteKit's filesystem | Hono |
| Build | One `node build.mjs` | Vite + adapter | None |
| SSR | Yes | Yes | Yes |
| Client reactivity | Yes (Svelte 5) | Yes | No |
| Edge cache (CF Workers) | Yes (built-in, content-hashed) | Yes (manual) | Yes (manual) |
| Conventions | None | Many | None |
| Library size | ~5 KB built | n/a (full framework) | bundled with Hono |

## Status

Shipping. Three exports, one build helper, content-hashed and edge-cached. The docs site is the receipt. See [CHANGELOG / npm](https://www.npmjs.com/package/svelte-hono) for the latest version.

## License

MIT — see [LICENSE](LICENSE).
