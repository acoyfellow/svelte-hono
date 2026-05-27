<script>
  import Layout from "./Layout.svelte";
  import { snippets } from "./snippets.generated.js";
  let { path = "/" } = $props();
</script>

<Layout {path}>
  {#snippet body()}
    <section class="hero">
      <h1>Drop a <code>.svelte</code> file in a Hono Worker.<br>That's it.</h1>
      <p class="lede">
        Real Svelte 5. Real SSR. Real hydration. No SvelteKit, no Vite, no scaffolding.
        Just one middleware, one route helper, one build step.
      </p>
      <div class="cta">
        <a class="primary" href="/start">5-min quickstart →</a>
        <a class="secondary" href="https://deploy.workers.cloudflare.com/?url=https://github.com/acoyfellow/svelte-hono" rel="noopener">Deploy the demo</a>
      </div>
    </section>

    <h2>The whole worker</h2>

    {@html snippets.homeWorker}

    <p>This page is the receipt — you're reading it. The site you're on is built with svelte-hono. <a href="/why">Why this exists →</a></p>

    <h2>What you get</h2>
    <ul>
      <li><strong>SSR first paint.</strong> The HTML is real, server-rendered Svelte. No blank flash.</li>
      <li><strong>Hydration after.</strong> Click handlers, <code>$state</code>, <code>$effect</code> all work.</li>
      <li><strong>One build step.</strong> <code>buildHonoSvelte()</code> handles both passes.</li>
      <li><strong>Cache API built in.</strong> Both HTML and client bundles use Cloudflare's <code>caches.default</code>. Second request per PoP returns from cache without re-rendering.</li>
      <li><strong>Cloudflare Workers native.</strong> No <code>eval</code>, no <code>new Function</code>, no codegen.</li>
      <li><strong>~5 KB library</strong> + your component bundle.</li>
    </ul>
  {/snippet}
</Layout>

<style>
  .hero { padding: 1.5rem 0 2rem; border-bottom: 1px solid var(--line); }
  .lede { font-size: 1.15rem; color: var(--fg-mut); max-width: 60ch; }
  .cta { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }
  .primary {
    background: var(--accent); color: white;
    padding: 0.65rem 1.1rem; border-radius: 6px; font-weight: 600;
  }
  .primary:hover { text-decoration: none; opacity: 0.92; }
  .secondary {
    border: 1px solid var(--line); color: var(--fg);
    padding: 0.65rem 1.1rem; border-radius: 6px; font-weight: 500; background: white;
  }
  .secondary:hover { text-decoration: none; border-color: var(--fg-mut); }
</style>
