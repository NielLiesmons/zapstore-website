<script>
  import "../app.css";
  import { page } from "$app/stores";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import NavigationProgress from "$lib/components/NavigationProgress.svelte";

  // ReachKit has its own layout with header/footer
  $: isReachKit = $page.url.pathname.startsWith("/studio/reachkit");

  // Detail pages use their own contextual header (DetailHeader)
  $: isDetailPage =
    /^\/apps\/[^/]+$/.test($page.url.pathname) ||
    /^\/stacks\/[^/]+$/.test($page.url.pathname) ||
    /^\/p\/[^/]+$/.test($page.url.pathname);

  // Landing page uses the default header variant
  $: isLandingPage = $page.url.pathname === "/";

  // Browse pages use the "browse" variant with page title
  $: headerVariant = isLandingPage ? "landing" : "browse";

  // Map paths to page titles for browse variant
  const pageTitles = {
    "/discover": "Discover",
    "/apps": "Apps",
    "/stacks": "Stacks",
    "/catalogs": "Catalogs",
    "/labels": "Labels",
    "/studio": "Studio",
    "/publish": "Publish",
    "/docs": "Docs",
    "/blog": "Blog",
    "/my-apps": "My Apps",
  };

  $: pageTitle =
    pageTitles[$page.url.pathname] ||
    ($page.url.pathname.startsWith("/docs/")
      ? "Docs"
      : $page.url.pathname.startsWith("/blog/")
        ? "Blog"
        : "");
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
      {#if !isDetailPage}
        <Header variant={headerVariant} {pageTitle} />
      {/if}
      <main class="flex-1" class:pt-16={!isDetailPage}>
        <slot />
      </main>
      {#if !isDetailPage}
        <Footer />
      {/if}
    </div>
  </div>
{/if}
