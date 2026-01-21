<script>
  /**
   * Catalogs Page
   * Lists all catalogs on Zapstore
   */
</script>

<svelte:head>
  <title>Catalogs — Zapstore</title>
  <meta name="description" content="Browse catalogs on Zapstore" />
</svelte:head>

<section class="catalogs-page">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <h1 class="text-2xl md:text-3xl font-bold mb-6">Catalogs</h1>

    <div class="placeholder-content">
      <p class="text-muted-foreground">Catalogs coming soon...</p>
    </div>
  </div>
</section>

<style>
  .catalogs-page {
    min-height: 100vh;
  }

  .placeholder-content {
    padding: 48px 24px;
    background-color: hsl(var(--gray66));
    border-radius: 16px;
    text-align: center;
  }
</style>
