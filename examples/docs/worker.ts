import { Hono } from "hono";
import { svelteRenderer, attachSvelteRoutes } from "../../dist/index.js";
import { bundles } from "./bundles.generated.js";
// @ts-expect-error -- generated at build time
import { version as SVELTE_HONO_VERSION } from "./version.generated.js";
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-expect-error -- esbuild-svelte emits a Svelte component module.
import Home from "./Home.svelte";
// @ts-expect-error
import Start from "./Start.svelte";
// @ts-expect-error
import Docs from "./Docs.svelte";
// @ts-expect-error
import Why from "./Why.svelte";
// @ts-expect-error
import Examples from "./Examples.svelte";

const app = new Hono();
attachSvelteRoutes(app, { bundles });

const SITE = "svelte-hono — Svelte 5 on Hono Workers";
const DESC = "Drop a .svelte file in a Hono Worker. Real SSR, real hydration, no SvelteKit.";

const meta = (path: string, titleSuffix: string) => `
<meta name="description" content="${DESC}">
<meta property="og:title" content="${titleSuffix ? titleSuffix + " — " + SITE : SITE}">
<meta property="og:description" content="${DESC}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://svelte-hono.coey.dev${path}">
<meta property="og:image" content="https://svelte-hono.coey.dev/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@acoyfellow">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ctext y='14' font-size='14'%3E🔥%3C/text%3E%3C/svg%3E">
`;

app.get("/", svelteRenderer(Home, {
  hydrateAs: "home",
  title: SITE,
  head: meta("/", ""),
  props: { path: "/" },
}));

app.get("/start", svelteRenderer(Start, {
  hydrateAs: "start",
  title: "Start — " + SITE,
  head: meta("/start", "5-minute quickstart"),
  props: { path: "/start" },
}));

app.get("/docs", svelteRenderer(Docs, {
  hydrateAs: "docs",
  title: "Docs — " + SITE,
  head: meta("/docs", "API reference"),
  props: { path: "/docs" },
}));

app.get("/why", svelteRenderer(Why, {
  hydrateAs: "why",
  title: "Why — " + SITE,
  head: meta("/why", "Why this exists"),
  props: { path: "/why" },
}));

app.get("/examples", svelteRenderer(Examples, {
  hydrateAs: "examples",
  title: "Examples — " + SITE,
  head: meta("/examples", "Examples"),
  props: { path: "/examples" },
}));

// Brand-aligned OG image. Pure SVG, no rendering pipeline. Edge-cached.
app.get("/og.png", async (c) => {
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  if (cache) {
    const hit = await cache.match(c.req.raw);
    if (hit) return hit;
  }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#fafaf7"/>
  <rect y="610" width="1200" height="20" fill="#ff5a1f"/>
  <text x="80" y="180" font-family="ui-monospace, monospace" font-size="42" fill="#5a5a5a">v${SVELTE_HONO_VERSION}</text>
  <text x="80" y="290" font-family="ui-sans-serif, system-ui" font-size="84" font-weight="700" fill="#1a1a1a" letter-spacing="-3">svelte-hono</text>
  <text x="80" y="380" font-family="ui-sans-serif, system-ui" font-size="36" fill="#1a1a1a">Svelte 5 on Hono Workers.</text>
  <text x="80" y="430" font-family="ui-sans-serif, system-ui" font-size="36" fill="#5a5a5a">Real SSR. Real hydration. No SvelteKit.</text>
  <text x="80" y="540" font-family="ui-monospace, monospace" font-size="24" fill="#5a5a5a">svelte-hono.coey.dev</text>
</svg>`;
  const response = new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
  if (cache) c.executionCtx.waitUntil(cache.put(c.req.raw, response.clone()));
  return response;
});

app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\nSitemap: https://svelte-hono.coey.dev/sitemap.xml\n"));

app.get("/sitemap.xml", (c) => {
  const urls = ["/", "/start", "/docs", "/why", "/examples"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://svelte-hono.coey.dev${u}</loc></url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
});

export default app;
