<script>
  import "../app.css";
  import { page } from "$app/stores";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import NavigationProgress from "$lib/components/NavigationProgress.svelte";

  // ReachKit has its own layout with header/footer
  $: isReachKit = $page.url.pathname.startsWith("/developers/reachkit");
</script>

<NavigationProgress />

{#if isReachKit}
  <!-- ReachKit handles its own layout -->
  <slot />
{:else}
  <div class="min-h-screen relative bg-background">
    <!-- Subtle gradient overlay -->
    <div class="fixed inset-0 bg-gradient-subtle pointer-events-none"></div>
    <!-- Noise/dither for depth -->
    <div class="fixed inset-0 bg-dither pointer-events-none opacity-40"></div>

    <div class="relative z-10 flex flex-col min-h-screen">
      <Header />
      <main class="flex-1 pt-16">
        <slot />
      </main>
      <Footer />
    </div>
  </div>
{/if}
