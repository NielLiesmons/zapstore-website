<script>
  import { page } from "$app/stores";
  import {
    LogIn,
    LogOut,
    Loader2,
    ChevronDown,
    Search,
    User,
  } from "lucide-svelte";
  import { Menu, Cross } from "$lib/components/icons";
  import { cn } from "$lib/utils";
  import { assets } from "$app/paths";
  import { onMount } from "svelte";
  import { authStore, connect, disconnect } from "$lib/stores/auth.js";
  import SearchModal from "./SearchModal.svelte";
  import ProfilePic from "./ProfilePic.svelte";
  import GetStartedModal from "./GetStartedModal.svelte";
  import SpinKeyModal from "./SpinKeyModal.svelte";

  /** @type {"landing" | "browse"} - Header variant */
  export let variant = "landing";

  /** @type {string} - Page title for browse variant */
  export let pageTitle = "";

  let scrolled = false;
  let dropdownOpen = false;
  let searchOpen = false;
  let searchQuery = "";
  let searchBarRef;
  let menuOpen = false;
  let menuContainer;
  let menuButton;

  // Onboarding modal state
  let getStartedModalOpen = false;
  let spinKeyModalOpen = false;
  let onboardingProfileName = "";

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
    if (menuOpen && menuContainer && !menuContainer.contains(event.target)) {
      menuOpen = false;
    }
  }

  function openSearch(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    searchOpen = true;
  }

  function toggleMenu(e) {
    if (e) e.stopPropagation();
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function openMenuSearch() {
    menuOpen = false;
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

  // Onboarding flow handlers
  function openGetStartedModal() {
    menuOpen = false;
    getStartedModalOpen = true;
  }

  function handleGetStartedStart(event) {
    onboardingProfileName = event.detail.profileName;
    // Open spin modal immediately, then close get started modal
    spinKeyModalOpen = true;
    // Small delay to let spin modal appear before closing get started
    setTimeout(() => {
      getStartedModalOpen = false;
    }, 50);
  }

  function handleGetStartedConnected() {
    // User connected with existing key
    getStartedModalOpen = false;
  }

  function handleSpinComplete(event) {
    const { nsec, secretKeyHex, pubkey, profileName } = event.detail;
    console.log("Key generated for:", profileName);
    console.log("Pubkey:", pubkey);
    // TODO: Store the key securely and create the profile
    // For now, just close the modal
    spinKeyModalOpen = false;
    // Could show a success message or redirect
  }

  function handleUseExistingKey() {
    spinKeyModalOpen = false;
    getStartedModalOpen = true;
  }
</script>

<header
  class={cn(
    "header fixed top-0 left-0 right-0 z-50 transition-all duration-300",
    scrolled
      ? "bg-background/60 border-b border-border/50"
      : "bg-transparent border-b border-transparent",
  )}
>
  <nav
    class={cn(
      "container mx-auto h-full",
      variant === "browse"
        ? "pl-1 pr-4 sm:pl-3 sm:pr-6 md:pl-5 md:pr-8"
        : "px-4 sm:px-6 md:px-8 lg:px-8",
    )}
  >
    <div class="flex items-center justify-between gap-2 sm:gap-6 h-full">
      <!-- Left: Logo or Menu + Page Title -->
      <div class="header-side flex items-center flex-shrink-0 min-w-0">
        {#if variant === "browse"}
          <!-- Browse variant: Menu button + Page title -->
          <div
            class="menu-container"
            bind:this={menuContainer}
            role="navigation"
            aria-label="Main menu"
          >
            <button
              type="button"
              class="menu-button"
              class:menu-button-open={menuOpen}
              bind:this={menuButton}
              on:click|stopPropagation={toggleMenu}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {#if menuOpen}
                <Cross
                  variant="outline"
                  color="hsl(var(--white33))"
                  size={14}
                />
              {:else}
                <Menu variant="outline" color="hsl(var(--white33))" size={16} />
              {/if}
            </button>

            <!-- Menu backdrop (mobile only) -->
            {#if menuOpen}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="menu-backdrop" on:click={closeMenu}></div>
            {/if}

            <!-- Menu dropdown -->
            {#if menuOpen}
              <div class="menu-dropdown">
                <!-- Logo section with user profile -->
                <div class="menu-header-row">
                  <a href="/" class="menu-logo" on:click={closeMenu}>
                    <svg
                      width="19"
                      height="32"
                      viewBox="0 0 19 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="menu-logo-icon"
                    >
                      <defs>
                        <linearGradient
                          id="menu-logo-gradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            style="stop-color: hsl(252, 100%, 72%);"
                          />
                          <stop
                            offset="100%"
                            style="stop-color: hsl(241, 100%, 68%);"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M18.8379 13.9711L8.84956 0.356086C8.30464 -0.386684 7.10438 0.128479 7.30103 1.02073L9.04686 8.94232C9.16268 9.46783 8.74887 9.96266 8.19641 9.9593L0.871032 9.91477C0.194934 9.91066 -0.223975 10.6293 0.126748 11.1916L7.69743 23.3297C7.99957 23.8141 7.73264 24.4447 7.16744 24.5816L5.40958 25.0076C4.70199 25.179 4.51727 26.0734 5.10186 26.4974L12.4572 31.8326C12.9554 32.194 13.6711 31.9411 13.8147 31.3529L15.8505 23.0152C16.0137 22.3465 15.3281 21.7801 14.6762 22.0452L13.0661 22.7001C12.5619 22.9052 11.991 22.6092 11.8849 22.0877L10.7521 16.5224C10.6486 16.014 11.038 15.5365 11.5704 15.5188L18.1639 15.2998C18.8529 15.2769 19.2383 14.517 18.8379 13.9711Z"
                        fill="url(#menu-logo-gradient)"
                      />
                    </svg>
                    <span class="menu-logo-text">Zapstore</span>
                  </a>
                  <!-- Profile pic (always visible when logged in) -->
                  {#if $authStore.isConnected}
                    <a
                      href="/p/{$authStore.npub}"
                      class="menu-user-pic-btn"
                      on:click={closeMenu}
                    >
                      <span class="menu-user-pic-mobile">
                        <ProfilePic
                          pictureUrl={$authStore.profile?.picture}
                          name={$authStore.profile?.displayName ||
                            $authStore.profile?.name}
                          pubkey={$authStore.pubkey}
                          size="md"
                        />
                      </span>
                      <span class="menu-user-pic-desktop">
                        <ProfilePic
                          pictureUrl={$authStore.profile?.picture}
                          name={$authStore.profile?.displayName ||
                            $authStore.profile?.name}
                          pubkey={$authStore.pubkey}
                          size="sm"
                        />
                      </span>
                    </a>
                  {/if}
                </div>

                <!-- Search bar button -->
                <button
                  type="button"
                  class="menu-search-btn"
                  on:click={openMenuSearch}
                >
                  <Search
                    class="h-5 w-5 flex-shrink-0"
                    style="color: hsl(var(--white33));"
                  />
                  <span class="menu-search-text">Search Any App</span>
                </button>

                <!-- Discover section -->
                <div class="menu-section">
                  <a
                    href="/discover"
                    class="menu-section-link"
                    on:click={closeMenu}>Discover</a
                  >
                  <nav class="menu-subnav">
                    <a
                      href="/discover"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Apps</a
                    >
                    <a
                      href="/stacks"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Stacks</a
                    >
                    <a
                      href="/catalogs"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Catalogs</a
                    >
                  </nav>
                </div>

                <!-- Studio section -->
                <div class="menu-section">
                  <a
                    href="/studio"
                    class="menu-section-link"
                    on:click={closeMenu}>Studio</a
                  >
                  <nav class="menu-subnav">
                    <a
                      href="/publish"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Publish</a
                    >
                    <a
                      href="/pro"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Pro</a
                    >
                    <a
                      href="/docs"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Docs</a
                    >
                    <a
                      href="/reachkit"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>ReachKit</a
                    >
                  </nav>
                </div>

                <!-- The App section -->
                <div class="menu-section">
                  <a href="/app" class="menu-section-link" on:click={closeMenu}
                    >The App</a
                  >
                  <nav class="menu-subnav">
                    <a
                      href="/about"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>About</a
                    >
                    <a
                      href="/download"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Download</a
                    >
                  </nav>
                </div>

                {#if !$authStore.isConnected}
                  <div class="menu-divider"></div>
                  <!-- Get Started button (only when not logged in) -->
                  <div class="menu-cta-wrapper">
                    <button
                      type="button"
                      class="btn-primary w-full"
                      on:click={openGetStartedModal}
                    >
                      Get Started
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <!-- Page title -->
          {#if pageTitle === "Studio"}
            <a href="/studio" class="flex items-center gap-3 ml-1">
              <svg
                width="15"
                height="20"
                viewBox="64 64 15 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 lg:h-7 w-auto flex-shrink-0"
              >
                <defs>
                  <linearGradient
                    id="header-studio-gradient"
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
                  d="M71.4271 64.0009C71.4756 63.9997 71.5243 63.9997 71.5728 64.0009C71.7346 64.0049 71.8944 64.0799 71.9931 64.2256L74.8616 68.4602C74.8676 68.4691 74.8732 68.4781 74.8785 68.4872C74.9007 68.5253 74.9208 68.5646 74.9462 68.6007L74.9542 68.612C75.1988 68.9609 74.9102 69.4216 74.4734 69.3795L73.3883 69.275C73.0394 69.2414 72.7583 69.5398 72.8303 69.8674L73.4327 73.1352C73.4589 73.2775 73.5317 73.4213 73.6767 73.4593C73.77 73.4838 73.872 73.4837 73.9725 73.4529L78.3235 71.9401C78.7191 71.8192 79.094 72.1663 78.9789 72.547L75.8194 83.6386C75.6627 84.1567 74.8757 84.1035 74.8039 83.57L74.0919 78.907C74.0625 78.7147 73.8297 78.6031 73.6396 78.5368L71.7235 77.8667C71.5791 77.8162 71.4207 77.8162 71.2763 77.8667L69.3604 78.5368C69.1703 78.6031 68.9373 78.7148 68.908 78.9071L68.1961 83.57C68.1243 84.1035 67.3373 84.1567 67.1806 83.6386L64.0211 72.547C63.906 72.1663 64.2808 71.8192 64.6765 71.9401L69.0275 73.4529C69.128 73.4837 69.2299 73.4838 69.3231 73.4593C69.4682 73.4213 69.5409 73.2775 69.5672 73.1352L70.1697 69.8674C70.2417 69.5398 69.9606 69.2414 69.6117 69.275L68.5264 69.3795C68.0897 69.4215 67.8012 68.9608 68.0458 68.612L68.0539 68.6005C68.079 68.5646 68.0989 68.5256 68.121 68.4879C68.1265 68.4786 68.1323 68.4694 68.1384 68.4602L71.0069 64.2256C71.1056 64.0799 71.2653 64.005 71.4271 64.0009Z"
                  fill="url(#header-studio-gradient)"
                />
              </svg>
              <span class="page-title font-semibold text-lg lg:text-xl tracking-tight">Studio</span>
            </a>
          {:else if pageTitle}
            <span
              class="page-title font-semibold text-lg lg:text-xl tracking-tight ml-2"
              >{pageTitle}</span
            >
          {/if}
        {:else}
          <!-- Landing variant: Logo + text that opens menu -->
          <div
            class="menu-container logo-menu-container"
            bind:this={menuContainer}
            role="navigation"
            aria-label="Main menu"
          >
            <button
              type="button"
              on:click|stopPropagation={toggleMenu}
              class="logo-button flex items-center gap-2 sm:gap-3"
              class:menu-open={menuOpen}
            >
              <svg
                width="19"
                height="32"
                viewBox="0 0 19 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 lg:h-7 w-auto flex-shrink-0"
              >
                <defs>
                  <linearGradient
                    id="logo-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style="stop-color: hsl(252, 100%, 72%);"
                    />
                    <stop
                      offset="100%"
                      style="stop-color: hsl(241, 100%, 68%);"
                    />
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
            </button>

            <!-- Menu backdrop (mobile only) -->
            {#if menuOpen}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="menu-backdrop" on:click={closeMenu}></div>
            {/if}

            <!-- Menu dropdown -->
            {#if menuOpen}
              <div class="menu-dropdown menu-dropdown-landing">
                <!-- Logo section (mobile only for landing variant) -->
                <div class="menu-header-row menu-header-mobile-only">
                  <a href="/" class="menu-logo" on:click={closeMenu}>
                    <svg
                      width="19"
                      height="32"
                      viewBox="0 0 19 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      class="menu-logo-icon"
                    >
                      <defs>
                        <linearGradient
                          id="menu-logo-gradient-landing"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            style="stop-color: hsl(252, 100%, 72%);"
                          />
                          <stop
                            offset="100%"
                            style="stop-color: hsl(241, 100%, 68%);"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M18.8379 13.9711L8.84956 0.356086C8.30464 -0.386684 7.10438 0.128479 7.30103 1.02073L9.04686 8.94232C9.16268 9.46783 8.74887 9.96266 8.19641 9.9593L0.871032 9.91477C0.194934 9.91066 -0.223975 10.6293 0.126748 11.1916L7.69743 23.3297C7.99957 23.8141 7.73264 24.4447 7.16744 24.5816L5.40958 25.0076C4.70199 25.179 4.51727 26.0734 5.10186 26.4974L12.4572 31.8326C12.9554 32.194 13.6711 31.9411 13.8147 31.3529L15.8505 23.0152C16.0137 22.3465 15.3281 21.7801 14.6762 22.0452L13.0661 22.7001C12.5619 22.9052 11.991 22.6092 11.8849 22.0877L10.7521 16.5224C10.6486 16.014 11.038 15.5365 11.5704 15.5188L18.1639 15.2998C18.8529 15.2769 19.2383 14.517 18.8379 13.9711Z"
                        fill="url(#menu-logo-gradient-landing)"
                      />
                    </svg>
                    <span class="menu-logo-text">Zapstore</span>
                  </a>
                  {#if $authStore.isConnected}
                    <a
                      href="/p/{$authStore.npub}"
                      class="menu-user-pic"
                      on:click={closeMenu}
                    >
                      <ProfilePic
                        pictureUrl={$authStore.profile?.picture}
                        name={$authStore.profile?.displayName ||
                          $authStore.profile?.name}
                        pubkey={$authStore.pubkey}
                        size="md"
                      />
                    </a>
                  {/if}
                </div>

                <!-- Search bar button (mobile only for landing variant) -->
                <button
                  type="button"
                  class="menu-search-btn menu-search-mobile-only"
                  on:click={openMenuSearch}
                >
                  <Search
                    class="h-5 w-5 flex-shrink-0"
                    style="color: hsl(var(--white33));"
                  />
                  <span class="menu-search-text">Search Any App</span>
                </button>

                <!-- Discover section -->
                <div class="menu-section">
                  <a
                    href="/discover"
                    class="menu-section-link"
                    on:click={closeMenu}>Discover</a
                  >
                  <nav class="menu-subnav">
                    <a
                      href="/discover"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Apps</a
                    >
                    <a
                      href="/stacks"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Stacks</a
                    >
                    <a
                      href="/catalogs"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Catalogs</a
                    >
                  </nav>
                </div>

                <!-- Studio section -->
                <div class="menu-section">
                  <a
                    href="/studio"
                    class="menu-section-link"
                    on:click={closeMenu}>Studio</a
                  >
                  <nav class="menu-subnav">
                    <a
                      href="/publish"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Publish</a
                    >
                    <a
                      href="/pro"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Pro</a
                    >
                    <a
                      href="/docs"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Docs</a
                    >
                    <a
                      href="/reachkit"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>ReachKit</a
                    >
                  </nav>
                </div>

                <!-- The App section -->
                <div class="menu-section">
                  <a href="/app" class="menu-section-link" on:click={closeMenu}
                    >The App</a
                  >
                  <nav class="menu-subnav">
                    <a
                      href="/about"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>About</a
                    >
                    <a
                      href="/download"
                      class="menu-sublink text-sm font-medium text-white/66"
                      on:click={closeMenu}>Download</a
                    >
                  </nav>
                </div>

                {#if !$authStore.isConnected}
                  <div class="menu-divider"></div>
                  <!-- Get Started button (only when not logged in) -->
                  <div class="menu-cta-wrapper">
                    <button
                      type="button"
                      class="btn-primary w-full"
                      on:click={openGetStartedModal}
                    >
                      Get Started
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Centered Search Bar (hidden on mobile) -->
      <div
        class="header-search-container hidden sm:flex flex-1 justify-center px-2 sm:px-3 min-w-0 lg:min-w-fit"
      >
        <button
          bind:this={searchBarRef}
          type="button"
          on:click={openSearch}
          class="search-bar-btn search-bar-width flex items-center gap-2 sm:gap-3 pl-2.5 pr-3 sm:pl-3 sm:pr-4 h-10 relative z-10 cursor-pointer min-w-0 lg:min-w-fit"
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
      <div
        class="header-side flex items-center justify-end flex-shrink-0 min-w-0"
      >
        {#if $authStore.isConnecting}
          <div class="h-10 w-10 flex items-center justify-center">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        {:else if $authStore.isConnected}
          <!-- My Apps Button -->
          <a href="/my-apps" class="btn-primary-small mr-2 sm:mr-4">My Apps</a>
          <!-- Profile Avatar with Dropdown -->
          <div class="relative profile-dropdown flex items-center">
            <ProfilePic
              pictureUrl={$authStore.profile?.picture}
              name={$authStore.profile?.displayName || $authStore.profile?.name}
              pubkey={$authStore.pubkey}
              size="md"
              onClick={toggleDropdown}
            />

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
            on:click={openGetStartedModal}
            class="btn-primary-small h-10 px-4"
          >
            <span class="sm:hidden">Start</span>
            <span class="hidden sm:inline">Get Started</span>
          </button>
        {/if}
      </div>
    </div>
  </nav>
</header>

<!-- Search Modal - rendered outside header to escape constraints -->
<SearchModal bind:open={searchOpen} bind:searchQuery {categories} {platforms} />

<!-- Onboarding Modals -->
<GetStartedModal
  bind:open={getStartedModalOpen}
  on:start={handleGetStartedStart}
  on:connected={handleGetStartedConnected}
/>

<SpinKeyModal
  bind:open={spinKeyModalOpen}
  profileName={onboardingProfileName}
  on:spinComplete={handleSpinComplete}
  on:useExistingKey={handleUseExistingKey}
/>

<style>
  /* Header height and blur */
  .header {
    height: 64px;
  }

  .header::before {
    content: "";
    position: absolute;
    inset: 0;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    z-index: -1;
  }

  /* Logo button (landing variant) */
  .logo-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.15s ease;
  }

  .logo-button.menu-open {
    opacity: 0.5;
  }

  /* Menu container */
  .menu-container {
    position: relative;
  }

  /* Menu button (browse variant) */
  .menu-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 12px;
    transition: background-color 0.15s ease;
  }

  .menu-button:hover,
  .menu-button-open {
    background-color: hsl(var(--gray66));
  }

  .menu-button :global(svg) {
    pointer-events: none;
  }

  /* Page title */
  .page-title {
    color: hsl(var(--white));
  }

  /* Menu backdrop (mobile only) */
  .menu-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background-color: hsl(var(--overlay));
    z-index: 99;
  }

  @media (min-width: 768px) {
    .menu-backdrop {
      display: none;
    }
  }

  /* Menu dropdown - mobile: full-height sheet from left */
  .menu-dropdown {
    position: fixed;
    top: 0;
    left: 0;
    width: 75%;
    max-width: 320px;
    height: 100vh;
    background-color: hsla(240, 6%, 18%, 0.8);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-right: 0.33px solid hsl(var(--white16));
    border-radius: 0;
    padding: 12px;
    z-index: 100;
    box-shadow: 8px 0 32px hsl(var(--black33));
    overflow-y: auto;
  }

  /* Desktop: dropdown positioned below button */
  @media (min-width: 768px) {
    .menu-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: 280px;
      max-width: none;
      height: auto;
      border: 0.33px solid hsl(var(--white16));
      border-radius: 12px 32px 32px 32px;
      box-shadow: 0 8px 32px hsl(var(--black33));
      padding: 12px;
      overflow-y: visible;
    }
  }

  /* Menu header row with logo and user pic */
  .menu-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  /* Logo section in menu - same height as profile pic (38px) */
  .menu-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 8px 0 6px;
    flex: 1;
    text-decoration: none;
    border-radius: 16px;
    transition: background-color 0.15s ease;
  }

  .menu-logo:hover {
    background-color: hsl(var(--white8));
  }

  .menu-logo-icon {
    height: 22px;
    width: auto;
    flex-shrink: 0;
  }

  .menu-logo-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: hsl(var(--white));
  }

  /* User profile pic in menu */
  .menu-user-pic {
    padding: 0;
    flex-shrink: 0;
  }

  /* Search bar button in menu */
  .menu-search-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 12px 0;
    padding: 8px 16px 8px 12px;
    background-color: hsl(var(--white8));
    border: 0.33px solid hsl(var(--white16));
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .menu-search-btn:hover {
    background-color: hsl(var(--white16));
  }

  .menu-search-text {
    color: hsl(var(--white33));
    font-size: 1rem;
  }

  /* Mobile-only elements in menu */
  .menu-search-mobile-only {
    display: flex;
  }

  @media (min-width: 768px) {
    .menu-search-mobile-only {
      display: none;
    }

    .menu-header-mobile-only {
      display: none;
    }
  }

  /* Profile pic button in menu - square, matches Zapstore button height */
  .menu-user-pic-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 16px;
    flex-shrink: 0;
    transition: background-color 0.15s ease;
    text-decoration: none;
  }

  .menu-user-pic-btn:hover {
    background-color: hsl(var(--white8));
  }

  /* Responsive profile pic sizes in menu */
  .menu-user-pic-mobile {
    display: flex;
  }

  .menu-user-pic-desktop {
    display: none;
  }

  @media (min-width: 768px) {
    .menu-user-pic-mobile {
      display: none;
    }

    .menu-user-pic-desktop {
      display: flex;
    }
  }

  /* Menu sections */
  .menu-section {
    margin-bottom: 4px;
  }

  /* Section link (big clickable item) */
  .menu-section-link {
    display: block;
    padding: 6px 10px;
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--white));
    text-decoration: none;
    border-radius: 10px;
    transition: background-color 0.15s ease;
  }

  .menu-section-link:hover {
    background-color: hsl(var(--white8));
  }

  /* Sub navigation */
  .menu-subnav {
    display: flex;
    flex-direction: column;
    padding-left: 10px;
  }

  .menu-sublink {
    padding: 6px 12px;
    text-decoration: none;
    border-radius: 12px;
    transition: background-color 0.15s ease;
  }

  .menu-sublink:hover {
    background-color: hsl(var(--white8));
  }

  /* Menu divider */
  .menu-divider {
    height: 1.4px;
    background-color: hsl(var(--white11));
    margin: 12px 0;
  }

  /* CTA wrapper */
  .menu-cta-wrapper {
    padding: 0 4px;
  }
</style>
