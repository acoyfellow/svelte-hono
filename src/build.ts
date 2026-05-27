// svelte-hono/build — the build helper.
//
// Three classes of output:
//
//   1. A shared `_runtime` bundle containing Svelte 5's client runtime +
//      side-effect imports + the user-facing `svelte` API (hydrate, mount,
//      unmount). One file across all components. Per-component bundles
//      below mark these modules `external`, so they import the runtime at
//      runtime via an import map the SSR shell emits.
//
//   2. Per-component client bundles, ~1-3 KB each instead of ~45 KB. The
//      `svelte`, `svelte/internal/client`, and `svelte/internal/disclose-version`
//      specifiers stay as bare imports in the output; the shell's import map
//      resolves them to the runtime URL.
//
//   3. A `bundles.generated.ts` next to the worker entry, exporting every
//      bundle (including `_runtime`) keyed by id. The worker passes it to
//      `attachSvelteRoutes`. No globals. No `define`.
//
// Plus one worker bundle build (Workers ESM) of the user's worker entry.
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
//   import { bundles } from "./bundles.generated";
//   attachSvelteRoutes(app, { bundles });
//
// Add `bundles.generated.ts` to .gitignore — it's regenerated each build.

import { build } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Short, URL-safe content hash. 8 hex chars = 32 bits = collision-safe for
 *  a per-build manifest with O(10³) entries. Matches Vite/webpack defaults. */
function contentHash(...parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 8);
}

export interface BuildHonoSvelteOptions {
  /** Path to the Worker entry (TS or JS). When `skipWorkerBundle` is true,
   *  this still needs to resolve to a directory — it's used as the base
   *  for resolving relative component paths and for writing the generated
   *  bundles module. */
  workerEntry: string;
  /** Output directory; will hold `worker.bundled.mjs` + intermediates. */
  outDir: string;
  /** Map of component id (the `hydrateAs` key) -> path to .svelte file. */
  components: Record<string, string>;
  /** ECMAScript target. Defaults to "es2022" (Workers-compatible). */
  target?: string;
  /** Set true for source maps + non-minified output. */
  dev?: boolean;
  /**
   * Filename of the generated bundles module, relative to the worker entry's
   * directory. Defaults to "bundles.generated.ts". The user imports from
   * this path (without extension) in their worker.
   */
  bundlesFile?: string;
  /**
   * Skip the worker-bundle step. Use when your Worker is built by another
   * tool (e.g. wrangler's built-in esbuild). The helper then only emits the
   * client artifacts (per-component bundles + _runtime + bundles.generated)
   * and your tool handles the worker.
   *
   * Defaults to `false` — the worker bundle is produced.
   */
  skipWorkerBundle?: boolean;
}

export interface BuildHonoSvelteResult {
  workerOutfile: string;
  bundleSizes: Record<string, { js: number; css: number; hash: string }>;
  workerBytes: number;
  bundlesFile: string;
}

export async function buildHonoSvelte(
  options: BuildHonoSvelteOptions,
): Promise<BuildHonoSvelteResult> {
  const target = options.target ?? "es2022";
  const dev = options.dev ?? false;
  const outDir = resolve(options.outDir);
  const workerEntry = resolve(options.workerEntry);
  const workerDir = dirname(workerEntry);
  const bundlesFile = options.bundlesFile ?? "bundles.generated.ts";
  const bundlesFilePath = resolve(workerDir, bundlesFile);

  mkdirSync(outDir, { recursive: true });

  const sveltePluginClient = sveltePlugin({
    compilerOptions: { generate: "client", dev, css: "external" },
  });
  const sveltePluginServer = sveltePlugin({
    compilerOptions: { generate: "server", dev, css: "external" },
  });

  // Modules every component bundle would otherwise duplicate. Externalizing
  // them drops per-bundle size from ~45 KB to ~1-3 KB; they're served once
  // via the shared `_runtime` bundle below.
  const SHARED_EXTERNALS = [
    "svelte",
    "svelte/internal/client",
    "svelte/internal/disclose-version",
  ] as const;

  // ── 1. Build the shared Svelte runtime bundle. ─────────────────────
  // One file for the lifetime of this Svelte version. Re-exports the entire
  // `svelte/internal/client` surface, the `svelte` user API (hydrate, mount,
  // unmount), and triggers disclose-version's side effect so window.__svelte
  // is populated for devtools.
  const runtimeEntry = join(outDir, "_runtime-entry.js");
  writeFileSync(
    runtimeEntry,
    `// Auto-generated by svelte-hono/build. Do not edit.
// Combines svelte's client runtime + disclose-version side effect + the
// user API into a single ESM module the per-component bundles import via
// an import map.
import "svelte/internal/disclose-version";
export * from "svelte/internal/client";
// Re-export the entire svelte user-API surface so component bundles can
// import any of: onMount, onDestroy, tick, getContext, setContext, untrack,
// flushSync, etc. The previous "only hydrate/mount/unmount" subset broke
// any component that used lifecycle helpers.
//
// Named re-exports for hydrate/mount/unmount come first so the
// per-component shim's 'import { hydrate as _hydrate } from svelte' always
// resolves. The duplicate mount/hydrate/unmount between 'svelte' and
// 'svelte/internal/client' would otherwise shadow them via the ES module
// ambiguity rule: 'export * from A; export * from B' with overlapping
// names makes those names inaccessible via the star. Explicit named
// re-exports win.
export { hydrate, mount, unmount } from "svelte";
export * from "svelte";
`,
  );
  const runtimeOutfile = join(outDir, "client-_runtime.js");
  await build({
    entryPoints: [runtimeEntry],
    bundle: true,
    format: "esm",
    platform: "browser",
    target,
    outfile: runtimeOutfile,
    minify: !dev,
    sourcemap: dev,
    logLevel: "silent",
  });
  const runtimeJs = readFileSync(runtimeOutfile, "utf8");

  const bundles: Record<string, { js: string; css: string; hash: string }> = {
    _runtime: { js: runtimeJs, css: "", hash: contentHash(runtimeJs) },
  };

  // ── 2. Per-component client bundles, runtime externalized. ───────────
  // Each bundle gets a content hash over (js + css). The hash is embedded
  // in the public URL: /__svelte/{id}.{hash}.js. New deploy → new bytes →
  // new hash → new URL → guaranteed cache miss. The previous URL is left
  // alone in browser/edge caches, which is fine: nothing references it.
  for (const [id, componentPath] of Object.entries(options.components)) {
    if (id === "_runtime") {
      throw new Error(
        `svelte-hono/build: "_runtime" is a reserved component id (used for the shared Svelte runtime).`,
      );
    }
    const resolved = resolve(workerDir, componentPath);
    const entryShim = join(outDir, `_client-entry-${id}.js`);
    writeFileSync(
      entryShim,
      `import Component from ${JSON.stringify(resolved)};
import { hydrate as _hydrate } from "svelte";
// hydrate(props, target?) — when target is omitted, mount on the default
// #svelte-hono-root. Pass a custom element to coexist with other embeds on
// the same page.
export function hydrate(props, target) {
  return _hydrate(Component, {
    target: target ?? document.getElementById("svelte-hono-root"),
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
      external: [...SHARED_EXTERNALS],
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
    bundles[id] = { js, css, hash: contentHash(js, css) };
  }

  // ── 2. Write bundles.generated.ts next to the worker entry. ─────────────
  // Plain ES module the worker imports. No globals, no define, no magic.
  writeFileSync(
    bundlesFilePath,
    `// Generated by svelte-hono/build. Do not edit. Regenerated on every build.\n` +
      `// Add this file to .gitignore.\n` +
      `import type { ClientBundle } from "svelte-hono";\n\n` +
      `export const bundles: Record<string, ClientBundle> = ${JSON.stringify(bundles, null, 2)};\n`,
  );

  // ── 3. Bundle the worker (unless the caller is bundling it themselves). ─
  const workerOutfile = join(outDir, "worker.bundled.mjs");
  let workerBytes = 0;
  if (!options.skipWorkerBundle) {
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
      external: ["cloudflare:workers"],
      logLevel: "silent",
    });
    workerBytes = readFileSync(workerOutfile).byteLength;
  }
  const bundleSizes: BuildHonoSvelteResult["bundleSizes"] = {};
  for (const [id, b] of Object.entries(bundles)) {
    bundleSizes[id] = { js: b.js.length, css: b.css.length, hash: b.hash };
  }

  return { workerOutfile, bundleSizes, workerBytes, bundlesFile: bundlesFilePath };
}

export async function buildHonoSvelteClientArtifacts(
  options: Omit<BuildHonoSvelteOptions, "skipWorkerBundle" | "workerEntry"> & {
    /** Used as the base for resolving relative component paths and the
     *  bundles.generated.ts output location. Pass any file in the project,
     *  typically your worker entry. */
    workerEntry: string;
  },
): Promise<Omit<BuildHonoSvelteResult, "workerOutfile" | "workerBytes">> {
  const r = await buildHonoSvelte({ ...options, skipWorkerBundle: true });
  return { bundleSizes: r.bundleSizes, bundlesFile: r.bundlesFile };
}
