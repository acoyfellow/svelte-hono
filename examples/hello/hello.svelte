<script>
  let { initialCount = 0 } = $props();
  let count = $state(0);
  // Seed once on mount; we don't want SSR/CSR to drift if props change.
  $effect(() => { count = initialCount; });

  function greet() {
    alert("Welcome to Svelte 5 on Hono on Workers!");
  }
</script>

<main>
  <h1>svelte-hono demo</h1>
  <p>Server-rendered, then hydrated. Click increments client-side.</p>
  <button onclick={() => count += 1}>clicks: {count}</button>
  <button onclick={greet}>say hi</button>
</main>

<style>
  :global(body) {
    font: 16px system-ui;
    max-width: 640px;
    margin: 4rem auto;
    padding: 0 1rem;
    color: #1a1a1a;
  }
  h1 { font-size: 2rem; }
  button {
    font-size: 1.2rem;
    padding: 0.6rem 1rem;
    margin-right: 0.5rem;
    cursor: pointer;
  }
</style>
