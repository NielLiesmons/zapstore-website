<script>
  import { authStore } from "$lib/stores/auth.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  // Redirect to home if not connected
  onMount(() => {
    if (!$authStore.isConnected && !$authStore.isConnecting) {
      goto("/");
    }
  });

  // Also watch for disconnection
  $: if (!$authStore.isConnected && !$authStore.isConnecting) {
    goto("/");
  }
</script>

<svelte:head>
  <title>My Apps — Zapstore</title>
  <meta
    name="description"
    content="Manage your apps, Stacks, and installations"
  />
</svelte:head>

<section class="py-12">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold mb-8">My Apps</h1>

    <div class="grid gap-8">
      <!-- Labeled Apps Section -->
      <div class="panel panel-p-24">
        <h2 class="text-xl font-semibold mb-4">Labeled Apps</h2>
        <p class="text-muted-foreground">
          Apps you've labeled will appear here.
        </p>
      </div>

      <!-- Stacks Section -->
      <div class="panel panel-p-24">
        <h2 class="text-xl font-semibold mb-4">My Stacks</h2>
        <p class="text-muted-foreground">
          Stacks you've created will appear here.
        </p>
      </div>

      <!-- Installed Apps Section -->
      <div class="panel panel-p-24">
        <h2 class="text-xl font-semibold mb-4">Installed Apps</h2>
        <p class="text-muted-foreground">
          Apps you've installed and their update status will appear here.
        </p>
      </div>
    </div>
  </div>
</section>
