// Source snippets shown on the docs site. build.mjs reads from here,
// pre-renders each with shiki at build time, writes the result to
// snippets.generated.js. Components import the generated module.

export const snippets = {
  homeWorker: {
    lang: "ts",
    code: `import { Hono } from "hono";
import { svelteRenderer, attachSvelteRoutes } from "svelte-hono";
import Hello from "./hello.svelte";

declare const __SVELTE_HONO_BUNDLES__: Record<string, { js: string; css: string }>;

const app = new Hono();
attachSvelteRoutes(app, { bundles: __SVELTE_HONO_BUNDLES__ });

app.get(
  "/",
  svelteRenderer(Hello, {
    hydrateAs: "hello",
    title: "Hello",
    props: { initialCount: 0 },
  }),
);

export default app;`,
  },

  startInstall: {
    lang: "bash",
    code: `npm i svelte-hono hono svelte
npm i -D esbuild esbuild-svelte wrangler`,
  },

  startComponent: {
    lang: "svelte",
    code: `<script>
  let { initialCount = 0 } = $props();
  let count = $state(0);
  $effect(() => { count = initialCount; });
</script>

<button onclick={() => count += 1}>clicks: {count}</button>`,
  },

  startWorker: {
    lang: "ts",
    code: `import { Hono } from "hono";
import { svelteRenderer, attachSvelteRoutes } from "svelte-hono";
import Hello from "./hello.svelte";

declare const __SVELTE_HONO_BUNDLES__: Record<string, { js: string; css: string }>;

const app = new Hono();
attachSvelteRoutes(app, { bundles: __SVELTE_HONO_BUNDLES__ });

app.get("/", svelteRenderer(Hello, { hydrateAs: "hello", title: "Hello" }));

export default app;`,
  },

  startBuild: {
    lang: "ts",
    code: `import { buildHonoSvelte } from "svelte-hono/build";

await buildHonoSvelte({
  workerEntry: "./worker.ts",
  outDir: "./build",
  components: { hello: "./hello.svelte" },
});`,
  },

  startWrangler: {
    lang: "toml",
    code: `name = "my-app"
main = "build/worker.bundled.mjs"
compatibility_date = "2026-04-21"
compatibility_flags = ["nodejs_compat"]

[build]
command = "node build.mjs"`,
  },

  startRun: {
    lang: "bash",
    code: `npx wrangler dev
# → http://localhost:8787`,
  },

  docsBundlesDecl: {
    lang: "ts",
    code: `declare const __SVELTE_HONO_BUNDLES__: Record<string, { js: string; css: string }>;`,
  },

  whyError: {
    lang: "text",
    code: `EvalError: Code generation from strings disallowed for this context`,
  },
};
