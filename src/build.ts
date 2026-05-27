// svelte-hono/build — the build helper.
//
// Replaces the boilerplate "two-esbuild-passes" build.mjs every consumer
// would otherwise write. Pass it a list of Svelte components + a worker
// entry; it emits a single bundled worker.js with the client bundles
// inlined as build-time string constants.
//
// Usage (in your project's build.mjs):
//
//   import { buildHonoSvelte } from "svelte-hono/build";
//
//   await buildHonoSvelte({
//     workerEntry: "./worker.ts",
//     outDir: "./build",
//     components: {
//       hello: "./hello.svelte",
//       about: "./about.svelte",
//     },
//   });
//
// Then in worker.ts:
//
//   declare const __SVELTE_HONO_BUNDLES__: Record<string, { js: string; css: string }>;
//   attachSvelteRoutes(app, { bundles: __SVELTE_HONO_BUNDLES__ });
//
// The bundles object is injected via esbuild `define` at build time.

import { build } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface BuildHonoSvelteOptions {
  /** Path to the Worker entry (TS or JS). */
  workerEntry: string;
  /** Output directory; will hold `worker.bundled.mjs` + intermediates. */
  outDir: string;
  /** Map of component id (the `hydrateAs` key) -> path to .svelte file. */
  components: Record<string, string>;
  /** ECMAScript target. Defaults to "es2022" (Workers-compatible). */
  target?: string;
  /** Set true for source maps + non-minified output. */
  dev?: boolean;
}

export interface BuildHonoSvelteResult {
  workerOutfile: string;
  bundleSizes: Record<string, { js: number; css: number }>;
  workerBytes: number;
}

export async function buildHonoSvelte(
  options: BuildHonoSvelteOptions,
): Promise<BuildHonoSvelteResult> {
  const target = options.target ?? "es2022";
  const dev = options.dev ?? false;
  const outDir = resolve(options.outDir);
  const workerEntry = resolve(options.workerEntry);

  mkdirSync(outDir, { recursive: true });

  const sveltePluginClient = sveltePlugin({
    compilerOptions: { generate: "client", dev, css: "external" },
  });
  const sveltePluginServer = sveltePlugin({
    compilerOptions: { generate: "server", dev, css: "external" },
  });

  // ── 1. Build each component's client bundle (browser ESM). ──────────────
  const bundles: Record<string, { js: string; css: string }> = {};

  for (const [id, componentPath] of Object.entries(options.components)) {
    const resolved = resolve(dirname(workerEntry), componentPath);
    const entryShim = join(outDir, `_client-entry-${id}.js`);
    writeFileSync(
      entryShim,
      `import Component from ${JSON.stringify(resolved)};
import { hydrate as _hydrate } from "svelte";
export function hydrate(props) {
  return _hydrate(Component, {
    target: document.getElementById("svelte-hono-root"),
    props,
  });
}
`,
    );
    const clientOutfile = join(outDir, `client-${id}.js`);
    await build({
      entryPoints: [entryShim],
      bundle: true,
      format: "esm",
      platform: "browser",
      target,
      outfile: clientOutfile,
      minify: !dev,
      sourcemap: dev,
      plugins: [sveltePluginClient],
      logLevel: "silent",
    });
    const js = readFileSync(clientOutfile, "utf8");
    let css = "";
    try {
      css = readFileSync(clientOutfile.replace(/\.js$/, ".css"), "utf8");
    } catch {
      css = "";
    }
    bundles[id] = { js, css };
  }

  // ── 2. Bundle the worker, inlining bundles via esbuild `define`. ────────
  const workerOutfile = join(outDir, "worker.bundled.mjs");
  await build({
    entryPoints: [workerEntry],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target,
    outfile: workerOutfile,
    minify: !dev,
    sourcemap: dev,
    plugins: [sveltePluginServer],
    define: {
      __SVELTE_HONO_BUNDLES__: JSON.stringify(bundles),
    },
    external: ["cloudflare:workers"],
    logLevel: "silent",
  });

  const workerBytes = readFileSync(workerOutfile).byteLength;
  const bundleSizes: BuildHonoSvelteResult["bundleSizes"] = {};
  for (const [id, b] of Object.entries(bundles)) {
    bundleSizes[id] = { js: b.js.length, css: b.css.length };
  }

  return { workerOutfile, bundleSizes, workerBytes };
}
