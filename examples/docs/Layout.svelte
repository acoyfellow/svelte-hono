<script>
  let { title = "svelte-hono", path = "/", body } = $props();

  const nav = [
    { href: "/", label: "Home" },
    { href: "/start", label: "Start" },
    { href: "/docs", label: "Docs" },
    { href: "/why", label: "Why" },
    { href: "/examples", label: "Examples" },
  ];
</script>

<header>
  <a href="/" class="brand">svelte-hono</a>
  <nav>
    {#each nav as link}
      <a href={link.href} class:active={path === link.href}>{link.label}</a>
    {/each}
    <a class="external" href="https://github.com/acoyfellow/svelte-hono" rel="noopener">GitHub →</a>
  </nav>
</header>

<main>
  {@render body?.()}
</main>

<footer>
  <span>v0.0.1 · <a href="https://github.com/acoyfellow/svelte-hono/blob/main/LICENSE">MIT</a></span>
  <span class="dim">made for fun by <a href="https://coey.dev" rel="noopener">@acoyfellow</a></span>
</footer>

<style>
  :global(:root) {
    --fg: #1a1a1a;
    --fg-mut: #5a5a5a;
    --bg: #fafaf7;
    --line: #e2e1da;
    --accent: #ff5a1f;
    --code-bg: #1a1a1a;
    --code-fg: #f3eee5;
  }
  :global(*) { box-sizing: border-box; }
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  :global(a) { color: var(--accent); text-decoration: none; }
  :global(a:hover) { text-decoration: underline; }
  :global(pre) {
    /* shiki emits its own <pre class="shiki"> with inline color styles. */
    padding: 1rem 1.25rem; border-radius: 8px;
    overflow-x: auto; font: 13.5px/1.55 ui-monospace, "SF Mono", Menlo, monospace;
    border: 1px solid var(--line);
  }
  :global(pre.shiki) { background: #fdfcf8 !important; }
  :global(code) {
    /* Inline code in body text. */
    font: 0.92em/1.4 ui-monospace, "SF Mono", Menlo, monospace;
    background: #efece4; color: var(--fg);
    padding: 0.1rem 0.35rem; border-radius: 4px;
  }
  :global(pre code) { background: transparent; color: inherit; padding: 0; font-size: 13.5px; }
  /* Inline <code> inside headings inherits heading size, no background. */
  :global(h1 code), :global(h2 code), :global(h3 code) {
    font-size: 0.85em; background: transparent; padding: 0;
    color: var(--accent);
  }
  :global(h1) { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; margin: 0 0 1rem; letter-spacing: -0.02em; }
  :global(h2) { font-size: 1.6rem; margin: 2.5rem 0 0.75rem; letter-spacing: -0.01em; }
  :global(h3) { font-size: 1.15rem; margin: 1.75rem 0 0.5rem; }
  :global(p) { margin: 0.5rem 0 1rem; }
  :global(ul) { padding-left: 1.25rem; }
  :global(li) { margin: 0.25rem 0; }
  :global(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  :global(th), :global(td) { text-align: left; border-bottom: 1px solid var(--line); padding: 0.5rem 0.6rem; font-size: 14.5px; }
  :global(th) { color: var(--fg-mut); font-weight: 600; }
  :global(.muted) { color: var(--fg-mut); }

  header {
    max-width: 880px; margin: 0 auto; padding: 1.5rem 1.25rem 0.5rem;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    border-bottom: 1px solid var(--line);
  }
  .brand {
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-weight: 700; letter-spacing: -0.02em; color: var(--fg);
    font-size: 1rem;
  }
  nav { display: flex; gap: 1.25rem; flex-wrap: wrap; }
  nav a { color: var(--fg-mut); font-size: 14.5px; }
  nav a.active { color: var(--fg); font-weight: 600; }
  nav a.external { color: var(--accent); }
  main { max-width: 880px; margin: 0 auto; padding: 2rem 1.25rem 4rem; min-height: 60vh; }
  footer {
    max-width: 880px; margin: 0 auto; padding: 1.5rem 1.25rem 2rem;
    border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    color: var(--fg-mut); font-size: 13.5px;
  }
  footer a { color: var(--fg-mut); }
  .dim { opacity: 0.8; }
</style>
