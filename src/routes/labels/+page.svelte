<script>
  /**
   * Labels Page
   * Lists all app labels and categories on Zapstore
   */
</script>

<svelte:head>
  <title>Labels — Zapstore</title>
  <meta
    name="description"
    content="Browse app labels and categories on Zapstore"
  />
</svelte:head>

<section class="labels-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <h1 class="text-2xl md:text-3xl font-bold mb-6">Labels</h1>

    <div class="placeholder-content">
      <p class="text-muted-foreground">
        App labels and categories coming soon...
      </p>
    </div>
  </div>
</section>

<style>
  .labels-page {
    min-height: 100vh;
  }

  .placeholder-content {
    padding: 48px 24px;
    background-color: hsl(var(--gray66));
    border-radius: 16px;
    text-align: center;
  }
</style>
