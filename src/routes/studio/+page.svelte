<script>
  import PublishAppSection from "$lib/components/developer/PublishAppSection.svelte";
  import DeveloperDashboard from "$lib/components/developer/DeveloperDashboard.svelte";
  import DeveloperHero from "$lib/components/developer/DeveloperHero.svelte";
  import { authStore } from "$lib/stores/auth.js";
</script>

<svelte:head>
  <title>Developers — Zapstore</title>
  <meta
    name="description"
    content="A purpose-built developer suite. Reliable tools for shipping apps and interacting with communities of users"
  />
</svelte:head>

{#if $authStore.isConnected}
  <!-- Dashboard for logged in users -->
  <DeveloperDashboard />
{:else}
  <!-- Hero Section for logged out users -->
  <DeveloperHero />

  <!-- Publish Without Permission Section -->
  <PublishAppSection />
{/if}
