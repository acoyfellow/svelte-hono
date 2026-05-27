<script>
  import Layout from "./Layout.svelte";
  import { snippets } from "./snippets.generated.js";
  let { path = "/start" } = $props();
</script>

<Layout {path}>
  {#snippet body()}
    <h1>5-minute quickstart</h1>
    <p class="muted">Set up a Hono Worker that renders Svelte 5 components. The repo lives at <a href="https://github.com/acoyfellow/svelte-hono">acoyfellow/svelte-hono</a>.</p>

    <h2>1. Install</h2>
    {@html snippets.startInstall}

    <h2>2. Make a component</h2>
    <p><code>hello.svelte</code>:</p>
    {@html snippets.startComponent}

    <h2>3. Make a worker</h2>
    <p><code>worker.ts</code>:</p>
    {@html snippets.startWorker}

    <h2>4. Make a build script</h2>
    <p><code>build.mjs</code>:</p>
    {@html snippets.startBuild}

    <h2>5. Wire wrangler</h2>
    <p><code>wrangler.toml</code>:</p>
    {@html snippets.startWrangler}

    <h2>6. Run it</h2>
    {@html snippets.startRun}

    <p>Click the button. Counter goes up. <a href="/docs">Full API →</a></p>
  {/snippet}
</Layout>
