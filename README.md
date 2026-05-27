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
- Edge-caches both HTML and client bundles via `caches.default`.
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

## Comparison

|  | svelte-hono | SvelteKit + adapter-cloudflare | hono/jsx |
|---|---|---|---|
| Routing | Hono | SvelteKit's filesystem | Hono |
| Build | One `node build.mjs` | Vite + adapter | None |
| SSR | Yes | Yes | Yes |
| Client reactivity | Yes (Svelte 5) | Yes | No |
| Edge cache (CF Workers) | Yes (built-in) | Yes (manual) | Yes (manual) |
| Conventions | None | Many | None |
| Library size | ~5 KB built | n/a (full framework) | bundled with Hono |

## Status

v0.0.1. Done. The version doesn't increment. Two exports, one build helper, edge-cached. The docs site is the receipt.

## License

MIT — see [LICENSE](LICENSE).
