<script>
  import { page } from "$app/stores";
  import {
    User,
    LogIn,
    LogOut,
    Loader2,
    ChevronDown,
    Search,
  } from "lucide-svelte";
  import { cn } from "$lib/utils";
  import { assets } from "$app/paths";
  import { onMount } from "svelte";
  import { authStore, connect, disconnect } from "$lib/stores/auth.js";
  import SearchModal from "./SearchModal.svelte";

  let scrolled = false;
  let dropdownOpen = false;
  let searchOpen = false;
  let searchQuery = "";
  let searchBarRef;

  // Categories and platforms for the search overlay
  const categories = [
    "Productivity",
    "Social",
    "Entertainment",
    "Utilities",
    "Developer Tools",
    "Games",
  ];

  const platforms = ["Android", "Mac", "Linux", "CLI", "Web", "iOS"];

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (dropdownOpen && !event.target.closest(".profile-dropdown")) {
      dropdownOpen = false;
    }
  }

  function openSearch(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    searchOpen = true;
  }

  onMount(() => {
    const handleScroll = () => {
      scrolled = window.scrollY > 10;
    };

    const handleKeydown = (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux) to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchOpen = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  async function handleSignIn() {
    try {
      await connect();
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  }

  function handleSignOut() {
    disconnect();
    dropdownOpen = false;
  }

  function toggleDropdown(e) {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
  }
</script>

<header
  class={cn(
    "sticky top-0 z-50 w-full transition-all duration-300",
    scrolled
      ? "bg-background/60 backdrop-blur-2xl border-b border-border/50"
      : "bg-transparent border-b border-transparent",
  )}
>
  <nav class="container mx-auto px-4 sm:px-6 md:px-8 lg:px-8">
    <div class="flex items-center justify-between gap-3 sm:gap-6 py-3">
      <!-- Logo -->
      <div class="header-side flex items-center flex-shrink-0">
        <a href="/" class="flex items-center gap-3 group">
          <svg
            width="19"
            height="32"
            viewBox="0 0 19 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 lg:h-7 w-auto"
          >
            <defs>
              <linearGradient
                id="logo-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" style="stop-color: hsl(252, 100%, 72%);" />
                <stop offset="100%" style="stop-color: hsl(241, 100%, 68%);" />
              </linearGradient>
            </defs>
            <path
              d="M18.8379 13.9711L8.84956 0.356086C8.30464 -0.386684 7.10438 0.128479 7.30103 1.02073L9.04686 8.94232C9.16268 9.46783 8.74887 9.96266 8.19641 9.9593L0.871032 9.91477C0.194934 9.91066 -0.223975 10.6293 0.126748 11.1916L7.69743 23.3297C7.99957 23.8141 7.73264 24.4447 7.16744 24.5816L5.40958 25.0076C4.70199 25.179 4.51727 26.0734 5.10186 26.4974L12.4572 31.8326C12.9554 32.194 13.6711 31.9411 13.8147 31.3529L15.8505 23.0152C16.0137 22.3465 15.3281 21.7801 14.6762 22.0452L13.0661 22.7001C12.5619 22.9052 11.991 22.6092 11.8849 22.0877L10.7521 16.5224C10.6486 16.014 11.038 15.5365 11.5704 15.5188L18.1639 15.2998C18.8529 15.2769 19.2383 14.517 18.8379 13.9711Z"
              fill="url(#logo-gradient)"
            />
          </svg>
          <span class="font-semibold text-lg lg:text-xl tracking-tight"
            >Zapstore</span
          >
        </a>
      </div>

      <!-- Centered Search Bar -->
      <div class="flex-1 flex justify-center px-3">
        <button
          bind:this={searchBarRef}
          type="button"
          on:click={openSearch}
          class="search-bar-btn search-bar-width flex items-center gap-3 px-4 h-10 relative z-10 cursor-pointer"
          style="border-color: hsl(var(--white16)); pointer-events: auto;"
        >
          <Search
            class="h-5 w-5 flex-shrink-0 pointer-events-none"
            style="color: hsl(var(--white33));"
          />
          <span
            class="text-base flex-1 text-left pointer-events-none"
            style="color: hsl(var(--white33));"
          >
            Search Any App
          </span>
        </button>
      </div>

      <!-- Auth Section (Right) -->
      <div class="header-side flex items-center justify-end flex-shrink-0">
        {#if $authStore.isConnecting}
          <div class="h-10 w-10 flex items-center justify-center">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        {:else if $authStore.isConnected}
          <!-- My Apps Button -->
          <a href="/my-apps" class="btn-primary-small mr-4"> My apps </a>
          <!-- Profile Avatar with Dropdown -->
          <div class="relative profile-dropdown">
            <button
              type="button"
              on:click={toggleDropdown}
              class="profile-avatar-btn h-10 w-10 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
              aria-label="User menu"
            >
              {#if $authStore.profile?.picture}
                <img
                  src={$authStore.profile.picture}
                  alt={$authStore.profile.displayName ||
                    $authStore.profile.name ||
                    "Profile"}
                  class="h-10 w-10 rounded-full object-cover bg-muted"
                />
              {:else}
                <div
                  class="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <User class="h-5 w-5 text-primary" />
                </div>
              {/if}
            </button>

            <!-- Dropdown Menu -->
            {#if dropdownOpen}
              <div
                class="absolute right-0 mt-2 w-48 rounded-lg overlay-surface shadow-lg py-1 z-50"
              >
                <a
                  href="/p/{$authStore.npub}"
                  class="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors"
                  on:click={() => (dropdownOpen = false)}
                >
                  <User class="h-4 w-4" />
                  View my profile
                </a>
                <div class="border-t border-border my-1"></div>
                <button
                  type="button"
                  on:click={handleSignOut}
                  class="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors w-full text-left"
                >
                  <LogOut class="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Get Started Button -->
          <button
            type="button"
            on:click={handleSignIn}
            class="btn-primary-small h-10 px-4"
          >
            Get Started
          </button>
        {/if}
      </div>
    </div>
  </nav>
</header>

<!-- Search Modal - rendered outside header to escape constraints -->
<SearchModal bind:open={searchOpen} bind:searchQuery {categories} {platforms} />
