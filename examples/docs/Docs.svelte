<script>
  import Layout from "./Layout.svelte";
  import { snippets } from "./snippets.generated.js";
  let { path = "/docs" } = $props();
</script>

<Layout {path}>
  {#snippet body()}
    <h1>API reference</h1>
    <p class="muted">v0.0.1 — minimal surface. Three exports. That's the API.</p>

    <h2>svelteRenderer(component, options)</h2>
    <p>Returns a Hono <code>MiddlewareHandler</code> that responds with an HTML document containing the SSR'd Svelte component, followed by a hydration script that mounts the matching client bundle.</p>

    <table>
      <thead>
        <tr><th>Option</th><th>Type</th><th>Required</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr><td><code>hydrateAs</code></td><td><code>string</code></td><td>yes</td><td>Matches a key in the bundles map passed to <code>attachSvelteRoutes</code>.</td></tr>
        <tr><td><code>props</code></td><td><code>Record&lt;string, unknown&gt;</code></td><td>no</td><td>Same props used by SSR and hydration. JSON-serialized into the page.</td></tr>
        <tr><td><code>title</code></td><td><code>string</code></td><td>no</td><td>Sets <code>&lt;title&gt;</code>.</td></tr>
        <tr><td><code>head</code></td><td><code>string</code></td><td>no</td><td>Extra raw <code>&lt;head&gt;</code> HTML.</td></tr>
        <tr><td><code>bodyClass</code></td><td><code>string</code></td><td>no</td><td>Class on the <code>&lt;body&gt;</code>.</td></tr>
      </tbody>
    </table>

    <h2>attachSvelteRoutes(app, options)</h2>
    <p>Registers <code>GET /__svelte/:id.&#123;js,css&#125;</code> routes on the Hono app. Call once per app instance. Idempotent.</p>

    <table>
      <thead><tr><th>Option</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>bundles</code></td><td><code>Record&lt;string, &#123; js, css &#125;&gt;</code></td><td>Keyed by <code>hydrateAs</code>. The build helper produces this.</td></tr>
        <tr><td><code>prefix</code></td><td><code>string</code></td><td>Defaults to <code>"/__svelte"</code>. Override only on collision.</td></tr>
      </tbody>
    </table>

    <h2>buildHonoSvelte(options)</h2>
    <p>From <code>svelte-hono/build</code>. Two esbuild passes — client + server — emitting a single bundled worker with all client bundles inlined as build-time string constants.</p>

    <table>
      <thead><tr><th>Option</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>workerEntry</code></td><td><code>string</code></td><td>Path to your Worker entry (TS or JS).</td></tr>
        <tr><td><code>outDir</code></td><td><code>string</code></td><td>Output dir. <code>worker.bundled.mjs</code> lands here.</td></tr>
        <tr><td><code>components</code></td><td><code>Record&lt;string, string&gt;</code></td><td>id → path to <code>.svelte</code> file. id matches <code>hydrateAs</code>.</td></tr>
        <tr><td><code>target</code></td><td><code>string</code></td><td>Defaults <code>"es2022"</code>.</td></tr>
        <tr><td><code>dev</code></td><td><code>boolean</code></td><td>Source maps + no minify. Defaults <code>false</code>.</td></tr>
      </tbody>
    </table>

    <h2>The constant the build injects</h2>
    <p>Inside your worker source:</p>
    {@html snippets.docsBundlesDecl}
    <p>esbuild's <code>define</code> replaces this identifier with a JSON object at build time. Pass it directly to <code>attachSvelteRoutes</code>.</p>

    <h2>Constraints</h2>
    <ul>
      <li><strong>Build-time compile.</strong> No <code>eval</code> at runtime — Workers prohibits it. See <a href="/why">Why</a>.</li>
      <li><strong>One root per page.</strong> SSR mount target is <code>#svelte-hono-root</code>.</li>
      <li><strong>Non-streaming HTML.</strong> Full document in one Response. Workers fan out at the edge; streaming is rarely the right primitive at this size.</li>
      <li><strong>Hono owns routing.</strong> No file-system router, no <code>load</code> functions, no <code>+layout.svelte</code>. Use Hono. That's the point.</li>
    </ul>
  {/snippet}
</Layout>
