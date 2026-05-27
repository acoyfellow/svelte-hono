<script>
  import Layout from "./Layout.svelte";
  import { snippets } from "./snippets.generated.js";
  let { path = "/why" } = $props();
</script>

<Layout {path}>
  {#snippet body()}
    <h1>Why this exists</h1>

    <p>You'd think rendering Svelte on a Cloudflare Worker would be easy. It is — but only if you compile at build time.</p>

    <h2>The codegen wall</h2>
    <p>Cloudflare Workers run on a V8 isolate with <strong>code generation from strings disabled</strong>. <code>eval</code>, <code>new Function</code>, and friends all throw at runtime:</p>

    {@html snippets.whyError}

    <p>That's a security feature, not a bug. It rules out a popular pattern: compile Svelte source on the edge with <code>svelte/compiler</code>, evaluate the compiled output via <code>new Function</code>, render via <code>svelte/server</code>.</p>

    <p>Several public projects appear to do this. They don't. Look at the request flow — anything claiming "edge SSR via runtime compile" on Workers is either skipping SSR (client-only mount) or quietly returning a 500 in production.</p>

    <h2>The fix</h2>
    <p>Move the compile to build time. <code>esbuild-svelte</code> in <code>server</code> mode produces an ES module that imports <code>svelte/internal/server</code> normally. Workers can import ES modules. Workers can call functions. There's no string to evaluate.</p>

    <p>At request time:</p>
    <ol>
      <li>Import the SSR module (built in advance).</li>
      <li>Call <code>render(component, &#123; props &#125;)</code> from <code>svelte/server</code>.</li>
      <li>Wrap the HTML in a shell with an inline script that hydrates from the pre-built client bundle.</li>
    </ol>

    <h2>What you lose</h2>
    <ul>
      <li>You can't accept Svelte source as a string at runtime. The source must be a real <code>.svelte</code> file the build sees.</li>
      <li>The bundle ships pre-compiled Svelte runtime. ~45 KB minified for a simple component.</li>
    </ul>

    <h2>What you keep</h2>
    <ul>
      <li>Real Svelte 5: <code>$state</code>, <code>$props</code>, <code>$effect</code>, snippets, etc.</li>
      <li>Real SSR — first paint is HTML, indexable, fast.</li>
      <li>Real hydration — events, reactivity, all of it.</li>
      <li>Hono's router on top.</li>
    </ul>

    <h2>Cache defaults</h2>
    <p>HTML responses ship with <code>Cache-Control: public, max-age=0, must-revalidate</code>. Browsers store the response but always revalidate before using it; Cloudflare's edge does not cache HTML. <strong>Deploys are visible immediately, everywhere.</strong></p>
    <p>Static bundles at <code>/__svelte/*.js</code> and <code>*.css</code> are immutable per build and cache for a year via the standard <code>caches.default</code> Cloudflare edge cache.</p>
    <p>If you want edge caching of HTML, opt in by passing <code>cacheControl: "public, max-age=60, s-maxage=300"</code> (or whatever you want) to <code>svelteRenderer</code>. Caching HTML is rarely worth it — SSR is fast, and the staleness cost on deploy is real. We default to correct, not fast.</p>

    <h2>Why not SvelteKit?</h2>
    <p>SvelteKit is a full framework — file-system router, layouts, <code>load</code> functions, an opinionated build, a Vite-based pipeline, an adapter per host. If you want all that, use it. <code>@sveltejs/adapter-cloudflare</code> is great.</p>
    <p>This is for a different shape: <em>"I'm already building a Hono Worker. I want components."</em></p>

    <h2>Why not just Hono JSX?</h2>
    <p>Hono JSX is excellent for SSR — but no client-side reactivity. If your page is interactive, Svelte 5's signal-based runtime is genuinely small and pleasant. Use Hono JSX when the page is read-only.</p>
  {/snippet}
</Layout>
