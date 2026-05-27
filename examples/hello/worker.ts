import { Hono } from "hono";
import { svelteRenderer, attachSvelteRoutes } from "../../dist/index.js";
// hello.svelte is compiled to an SSR module by esbuild-svelte at build time.
// @ts-expect-error -- esbuild-svelte emits a Svelte component module; types are not first-class here.
import Hello from "./hello.svelte";

// Injected by buildHonoSvelte via esbuild `define`.
declare const __SVELTE_HONO_BUNDLES__: Record<string, { js: string; css: string }>;

const app = new Hono();

attachSvelteRoutes(app, { bundles: __SVELTE_HONO_BUNDLES__ });

app.get(
  "/",
  svelteRenderer(Hello, {
    hydrateAs: "hello",
    title: "svelte-hono hello",
    props: { initialCount: 0 },
  }),
);

export default app;
