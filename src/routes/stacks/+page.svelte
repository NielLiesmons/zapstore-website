<script>
  /**
   * All Stacks Page
   * Lists all app stacks available on Zapstore
   */
</script>

<svelte:head>
  <title>All Stacks — Zapstore</title>
  <meta name="description" content="Browse all app stacks on Zapstore" />
</svelte:head>

<section class="all-stacks-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <h1 class="text-2xl md:text-3xl font-bold mb-6">All Stacks</h1>

    <div class="placeholder-content">
      <p class="text-muted-foreground">Full stacks listing coming soon...</p>
    </div>
  </div>
</section>

<style>
  .all-stacks-page {
    min-height: 100vh;
  }

  .placeholder-content {
    padding: 48px 24px;
    background-color: hsl(var(--gray66));
    border-radius: 16px;
    text-align: center;
  }
</style>
