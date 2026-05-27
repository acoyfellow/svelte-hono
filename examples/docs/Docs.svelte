<script>
  import Layout from "./Layout.svelte";
  import { snippets } from "./snippets.generated.js";
  import { version } from "./version.generated.js";
  let { path = "/docs" } = $props();
</script>

<Layout {path}>
  {#snippet body()}
    <h1>API reference</h1>
    <p class="muted">v{version} — minimal surface. Three exports. That's the API.</p>

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
        <tr><td><code>cacheControl</code></td><td><code>string | false</code></td><td>no</td><td>Cache-Control for the HTML. Defaults to <code>"public, max-age=0, must-revalidate"</code> — deploys are visible immediately. Pass <code>"public, max-age=60, s-maxage=300"</code> to let Cloudflare cache the HTML. Pass <code>false</code> to omit the header. See <a href="/why#caching">Caching</a>.</td></tr>
      </tbody>
    </table>

    <h2>attachSvelteRoutes(app, options)</h2>
    <p>Registers <code>GET /__svelte/:id.&#123;hash&#125;.&#123;js,css&#125;</code> routes on the Hono app (legacy unhashed <code>:id.&#123;js,css&#125;</code> also accepted, with weaker caching). Call once per app instance. Idempotent.</p>

    <table>
      <thead><tr><th>Option</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>bundles</code></td><td><code>Record&lt;string, ClientBundle&gt;</code></td><td>Keyed by <code>hydrateAs</code>. The build helper produces this. Each <code>ClientBundle</code> is <code>&#123; js, css, hash? &#125;</code>; when <code>hash</code> is set, URLs are content-addressed and served with <code>cache-control: immutable</code>.</td></tr>
        <tr><td><code>prefix</code></td><td><code>string</code></td><td>Defaults to <code>"/__svelte"</code>. Override only on collision.</td></tr>
      </tbody>
    </table>

    <h2>buildHonoSvelte(options)</h2>
    <p>From <code>svelte-hono/build</code>. Three esbuild passes — a shared Svelte runtime chunk, one per-component client chunk, and one server pass — emitting a single bundled worker with all client bundles inlined as build-time string constants. Every bundle is content-hashed so deploys never collide with browser/edge caches.</p>

    <table>
      <thead><tr><th>Option</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>workerEntry</code></td><td><code>string</code></td><td>Path to your Worker entry (TS or JS).</td></tr>
        <tr><td><code>outDir</code></td><td><code>string</code></td><td>Output dir. <code>worker.bundled.mjs</code> lands here.</td></tr>
        <tr><td><code>components</code></td><td><code>Record&lt;string, string&gt;</code></td><td>id → path to <code>.svelte</code> file. id matches <code>hydrateAs</code>.</td></tr>
        <tr><td><code>target</code></td><td><code>string</code></td><td>Defaults <code>"es2022"</code>.</td></tr>
        <tr><td><code>dev</code></td><td><code>boolean</code></td><td>Source maps + no minify. Defaults <code>false</code>.</td></tr>
        <tr><td><code>bundlesFile</code></td><td><code>string</code></td><td>Filename of the generated bundles module, relative to the worker entry's directory. Defaults to <code>"bundles.generated.ts"</code>.</td></tr>
        <tr><td><code>skipWorkerBundle</code></td><td><code>boolean</code></td><td>Only build client bundles + write <code>bundles.generated.ts</code>; skip the final worker bundle. Useful when another tool (e.g. wrangler) bundles the worker.</td></tr>
      </tbody>
    </table>

    <h2>The generated bundles import</h2>
    <p><code>buildHonoSvelte()</code> writes <code>bundles.generated.ts</code> next to your worker entry. Import it like any other module:</p>
    {@html snippets.docsImport}
    <p>Add it to <code>.gitignore</code> — it's regenerated each build. No globals, no <code>declare const</code>, no esbuild <code>define</code> magic to learn.</p>

    <h2>Mounting on a custom DOM node</h2>
    <p>The generated <code>hydrate</code> function accepts an optional second argument:</p>
    <pre><code>hydrate(props, target?)</code></pre>
    <p>When omitted, it mounts on <code>#svelte-hono-root</code> (the default SSR target). Pass a different element to embed multiple components on one page — for example, mounting Svelte islands into Hono JSX output.</p>

    <h2>Constraints</h2>
    <ul>
      <li><strong>Build-time compile.</strong> No <code>eval</code> at runtime — Workers prohibits it. See <a href="/why">Why</a>.</li>
      <li><strong>Default SSR root.</strong> Without a custom target, mount goes to <code>#svelte-hono-root</code>. Pass a target to <code>hydrate(props, target)</code> for multi-component pages.</li>
      <li><strong>Non-streaming HTML.</strong> Full document in one Response. Workers fan out at the edge; streaming is rarely the right primitive at this size.</li>
      <li><strong>Hono owns routing.</strong> No file-system router, no <code>load</code> functions, no <code>+layout.svelte</code>. Use Hono. That's the point.</li>
    </ul>
  {/snippet}
</Layout>
