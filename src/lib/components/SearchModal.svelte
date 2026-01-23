<script>
  import { Search, X } from "lucide-svelte";
  import { fade } from "svelte/transition";
  import Label from "./Label.svelte";
  import ProfilePic from "./ProfilePic.svelte";
  import { ChevronRight, Magic } from "$lib/components/icons";
  import { wheelScroll } from "$lib/actions/wheelScroll.js";

  export let open = false;
  export let searchQuery = "";
  export let categories = [];
  export let platforms = [];

  let searchInput;

  // Catalog data - placeholder images for now
  const catalogs = [
    { name: "Zapstore", image: "" },
    { name: "Beta Males", image: "" },
    { name: "Google Play", image: "" },
    { name: "Github", image: "" },
  ];

  // Dummy suggestions - these would come from a real search in the future
  const dummySuggestions = [
    "Testflight",
    "Internet Speed Test",
    "CPU Stress Test",
    "TestDPC",
    "ABTester",
  ];

  // Show all dummy suggestions when typing
  $: suggestions = searchQuery.trim() ? dummySuggestions : [];

  $: showSuggestions = searchQuery.trim().length > 0;

  // Close handlers
  $: if (!open) {
    searchQuery = "";
  }

  // Focus search input when modal opens
  $: if (open && searchInput) {
    setTimeout(() => {
      searchInput?.focus();
    }, 100);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      open = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      open = false;
    }
  }

  function handleSuggestionClick(suggestion) {
    searchQuery = suggestion;
    // In the future, this would navigate to the app
  }

  function handleDescribeClick() {
    // In the future, this would trigger AI-powered search
    console.log("Describe search:", searchQuery);
  }
</script>

<!-- Platform icon components -->
{#snippet AppleIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
    />
  </svg>
{/snippet}

{#snippet AndroidIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 003 18h18a10.78 10.78 0 00-3.4-8.52zM8.5 14c-.83 0-1.5-.67-1.5-1.5S7.67 11 8.5 11s1.5.67 1.5 1.5S9.33 14 8.5 14zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
    />
  </svg>
{/snippet}

{#snippet WindowsIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"
    />
  </svg>
{/snippet}

{#snippet LinuxIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587.006 1.22-.057 1.79-.179.57-.13 1.106-.345 1.542-.665a.45.45 0 00.13-.118c.053.088.12.166.2.235.44.396.936.585 1.456.678.52.094 1.063.088 1.574.043.5-.058 1.006-.13 1.379-.352.19-.11.363-.272.482-.486a1.23 1.23 0 00.148-.582c.002-.27-.073-.524-.19-.748-.058-.106-.12-.207-.179-.294l-.019-.028a4.474 4.474 0 01-.198-.32c-.142-.265-.238-.565-.268-.865-.036-.358.01-.74.138-1.107.134-.373.354-.725.652-1.027.065-.07.133-.136.204-.2a1.55 1.55 0 00-.167-.083c-.12-.057-.266-.108-.388-.19a2.233 2.233 0 01-.313-.265 3.86 3.86 0 01-.372-.408c-.096-.12-.19-.25-.278-.375a15.21 15.21 0 01-.225-.342c-.16-.266-.326-.502-.498-.705a4.06 4.06 0 00-.532-.512 2.76 2.76 0 00-.503-.307c.03-.28.04-.573.035-.87-.01-.7-.11-1.44-.333-2.088-.224-.647-.559-1.207-1.018-1.598-.456-.395-1.046-.63-1.757-.678-.707-.055-1.44.064-2.136.35-.694.288-1.352.75-1.863 1.404-.51.65-.855 1.474-.987 2.453-.13.985-.036 2.117.302 3.31.03.13.07.256.11.382-.23.135-.445.295-.644.475a5.61 5.61 0 00-.5.515c-.15.183-.28.38-.39.586a2.1 2.1 0 00-.192.655 1.86 1.86 0 00.046.702c.062.218.16.421.29.605l.016.022c-.076.12-.14.25-.19.39-.107.282-.157.585-.147.885.01.3.08.598.203.873.123.277.297.53.52.75l.032.032c.094.085.2.16.31.23a.424.424 0 00-.013.089c-.002.257.097.522.26.756.163.233.39.436.66.593l.023.013c-.142.143-.255.315-.332.51a1.67 1.67 0 00-.117.602c0 .257.063.5.17.722.106.224.258.42.444.58.189.16.408.284.65.37.24.087.505.135.784.135.273 0 .535-.046.773-.13.237-.09.454-.22.635-.4.183-.17.327-.39.42-.63.096-.24.143-.51.143-.79 0-.18-.023-.36-.073-.53a1.79 1.79 0 00-.193-.44.424.424 0 00.037-.026c.2-.154.342-.352.417-.577.075-.226.08-.474.027-.708a1.86 1.86 0 00-.198-.479z"
    />
  </svg>
{/snippet}

{#snippet WebIcon()}
  <svg
    class="platform-icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm7.931 9h-2.764a14.67 14.67 0 0 0-1.792-6.243A8.013 8.013 0 0 1 19.931 11zM12.53 4.027c1.035 1.364 2.427 3.78 2.627 6.973H9.03c.139-2.596.994-5.028 2.451-6.974.172-.01.344-.026.519-.026.179 0 .354.016.53.027zm-3.842.511C7.704 6.618 7.136 8.762 7.03 11H4.069a8.013 8.013 0 0 1 4.619-6.462zM4.069 13h2.974c.136 2.379.665 4.478 1.556 6.23A8.01 8.01 0 0 1 4.069 13zm7.381 6.973C10.049 18.275 9.222 15.896 9.041 13h6.113c-.208 2.773-1.117 5.196-2.603 6.972-.182.012-.364.028-.551.028-.186 0-.367-.016-.55-.027zm4.011-.772c.955-1.794 1.538-3.901 1.691-6.201h2.778a8.005 8.005 0 0 1-4.469 6.201z"
    />
  </svg>
{/snippet}

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
  <div
    class="fixed inset-0 z-[100] bg-overlay flex justify-center items-start"
    style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important;"
    transition:fade={{ duration: 150 }}
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-label="Search overlay"
    tabindex="-1"
  >
    <!-- Modal -->
    <div
      class="border-subtle shadow-2xl overflow-hidden backdrop-blur-lg w-full search-modal-width mx-0 sm:mx-4"
      style="
        background: linear-gradient(
          to bottom,
          hsl(var(--gray33)),
          hsl(241 15% 25% / 0.5)
        );
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        border-bottom-left-radius: var(--radius-32);
        border-bottom-right-radius: var(--radius-32);
      "
      transition:fade={{ duration: 150 }}
    >
      <!-- Search Bar -->
      <div class="p-3 pb-1">
        <div
          class="search-bar-btn flex items-center gap-3 px-4 h-10 transition-all duration-200 focus-within:shadow-[0_0_80px_hsl(var(--blurpleColor)/0.2),0_0_160px_hsl(var(--blurpleColor)/0.15),0_0_240px_hsl(var(--blurpleColor)/0.12),0_0_320px_hsl(var(--blurpleColor)/0.08)]"
          style="border-color: hsl(var(--white16)); background-color: hsl(var(--black16));"
        >
          <Search class="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            bind:this={searchInput}
            type="text"
            bind:value={searchQuery}
            placeholder="Search or Describe apps"
            class="search-input flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
          />
          <button
            type="button"
            on:click={() => (open = false)}
            class="close-btn rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close search"
          >
            <X class="h-5 w-5" style="color: hsl(var(--white33));" />
          </button>
        </div>
      </div>

      <!-- Suggestions (shown when typing) -->
      {#if showSuggestions}
        <div class="suggestions-area px-3 pb-2">
          {#each suggestions as suggestion}
            <button
              type="button"
              class="suggestion-item w-full text-left px-4 py-1.5 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
              on:click={() => handleSuggestionClick(suggestion)}
            >
              <Search
                class="h-5 w-5 flex-shrink-0"
                style="color: hsl(var(--white16));"
              />
              <span style="color: hsl(var(--white66));">{suggestion}</span>
            </button>
          {/each}

          <!-- AI Describe Option -->
          <button
            type="button"
            class="suggestion-item w-full text-left px-4 py-1.5 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
            on:click={handleDescribeClick}
          >
            <Magic variant="fill" size={20} color="url(#blurple-gradient)" />
            <span
              style="background: var(--gradient-gray66); -webkit-background-clip: text; background-clip: text; color: transparent;"
              >Search with description</span
            >
          </button>
        </div>

        <!-- SVG Gradient Definitions -->
        <svg width="0" height="0" style="position: absolute;">
          <defs>
            <linearGradient
              id="blurple-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                style="stop-color: hsl(var(--blurpleColor66));"
              />
              <stop
                offset="100%"
                style="stop-color: hsl(var(--blurpleColor));"
              />
            </linearGradient>
            <linearGradient
              id="text-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" style="stop-color: hsl(var(--white66));" />
              <stop
                offset="100%"
                style="stop-color: hsl(var(--blurpleColor66));"
              />
            </linearGradient>
          </defs>
        </svg>
      {/if}

      <!-- Content Area -->
      <div class="content-area flex flex-col gap-4">
        <!-- Catalogs Section -->
        <div>
          <div class="section-header flex items-center justify-between mb-2">
            <h3 class="eyebrow-label">Catalogs</h3>
            <button
              type="button"
              class="more-btn flex items-center gap-1.5 cursor-pointer"
            >
              <span class="text-xs" style="color: hsl(var(--white33));"
                >More</span
              >
              <ChevronRight
                variant="outline"
                color="hsl(var(--white33))"
                size={10}
              />
            </button>
          </div>
          <div class="scrollable-row scrollbar-hide" use:wheelScroll>
            <div class="flex gap-2">
              {#each catalogs as catalog}
                <button
                  type="button"
                  class="catalog-pill flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
                >
                  <ProfilePic
                    pictureUrl={catalog.image || null}
                    name={catalog.name}
                    size="sm"
                  />
                  <span
                    class="text-sm whitespace-nowrap"
                    style="color: hsl(var(--white66));">{catalog.name}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Labels Section -->
        <div>
          <div class="section-header flex items-center justify-between mb-2">
            <h3 class="eyebrow-label">Labels</h3>
            <button
              type="button"
              class="more-btn flex items-center gap-1.5 cursor-pointer"
            >
              <span class="text-xs" style="color: hsl(var(--white33));"
                >More</span
              >
              <ChevronRight
                variant="outline"
                color="hsl(var(--white33))"
                size={10}
              />
            </button>
          </div>
          <div class="scrollable-row scrollbar-hide" use:wheelScroll>
            <div class="flex gap-2">
              {#each categories as category}
                <div class="flex-shrink-0">
                  <Label
                    text={category}
                    isSelected={false}
                    isEmphasized={false}
                  />
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Platforms Section -->
        <div class="pb-4">
          <div class="section-header mb-2">
            <h3 class="eyebrow-label">Platforms</h3>
          </div>
          <div class="flex flex-wrap gap-2 px-4">
            {#each platforms as platform}
              <button
                type="button"
                class="pill flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {#if platform === "iOS" || platform === "macOS" || platform === "Mac"}
                  {@render AppleIcon()}
                {:else if platform === "Android"}
                  {@render AndroidIcon()}
                {:else if platform === "Windows"}
                  {@render WindowsIcon()}
                {:else if platform === "Linux"}
                  {@render LinuxIcon()}
                {:else}
                  {@render WebIcon()}
                {/if}
                <span
                  class="text-sm whitespace-nowrap"
                  style="color: hsl(var(--white66));">{platform}</span
                >
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .close-btn {
    padding: 0.125rem;
    margin-right: -0.25rem;
  }

  .content-area {
    padding-top: 0.5rem;
  }

  .section-header {
    padding-left: 1rem;
    padding-right: 0.75rem;
  }

  .more-btn {
    background: none;
    border: none;
    padding: 0;
  }

  .more-btn:hover span {
    color: hsl(var(--white66)) !important;
  }

  .scrollable-row {
    overflow-x: auto;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Catalog pill - hugs ProfilePic with equal padding */
  .catalog-pill {
    padding: 4px;
    padding-right: 0.875rem;
    border-radius: 9999px;
  }

  /* Platform pill - matches Label height (32px) */
  .pill {
    height: 32px;
    padding: 0 0.875rem 0 0.5rem;
    border-radius: 9999px;
  }

  .platform-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: hsl(var(--white33));
  }

  .suggestions-area {
    border-bottom: 1px solid hsl(var(--white8));
    margin-bottom: 0.5rem;
  }

  .suggestion-item {
    background: none;
    border: none;
    font-size: 0.875rem;
  }
</style>
