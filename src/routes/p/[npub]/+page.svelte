<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { Package, Calendar, User, Globe, Github } from "lucide-svelte";
  import {
    fetchApps,
    fetchProfile,
    formatDate,
    getAppSlug,
    pubkeyToNpub,
    fetchAppVersion,
  } from "$lib/nostr.js";
  import * as nip19 from "nostr-tools/nip19";
  import NostrContent from "$lib/components/NostrContent.svelte";
  import ProfilePic from "$lib/components/ProfilePic.svelte";
  import AppPic from "$lib/components/AppPic.svelte";
  import DetailHeader from "$lib/components/DetailHeader.svelte";

  let developer = null;
  let apps = [];
  let loading = true;
  let error = null;
  let pubkey = "";
  let npub = "";

  // Zapstore's own npub - don't show published apps for this profile
  const ZAPSTORE_NPUB =
    "npub10r8xl2njyepcw2zwv3a6dyufj4e4ajx86hz6v4ehu4gnpupxxp7stjt2p8";

  // Store versions fetched from FileMetadata
  let appVersions = new Map();

  // Fetch version for an app from FileMetadata
  async function loadVersionForApp(app) {
    if (!app?.id || appVersions.has(app.id)) return;
    const version = await fetchAppVersion(app);
    if (version) {
      appVersions.set(app.id, version);
      appVersions = appVersions; // Trigger reactivity
    }
  }

  async function loadDeveloperData() {
    try {
      loading = true;
      error = null;

      // Get npub from URL parameter
      npub = $page.params.npub;

      // Validate and convert npub to pubkey
      try {
        const decoded = nip19.decode(npub);
        if (decoded.type !== "npub") {
          throw new Error("Invalid npub format");
        }
        pubkey = decoded.data;
      } catch (err) {
        error = "Invalid profile identifier";
        loading = false;
        return;
      }

      // For Zapstore's own profile, don't fetch apps
      const isZapstore = npub === ZAPSTORE_NPUB;

      if (isZapstore) {
        // Only fetch profile for Zapstore
        developer = await fetchProfile(pubkey);
        apps = [];
      } else {
        // Fetch developer profile and apps in parallel
        const [developerProfile, developerApps] = await Promise.all([
          fetchProfile(pubkey),
          fetchApps({ authors: [pubkey], limit: 50 }),
        ]);
        developer = developerProfile;
        apps = developerApps;

        // Fetch versions for all apps
        apps.forEach((app) => loadVersionForApp(app));
      }

      loading = false;
    } catch (err) {
      console.error("Error fetching profile data:", err);
      error = err.message;
      loading = false;
    }
  }

  onMount(() => {
    loadDeveloperData();
  });

  function getAppUrl(app) {
    return `/apps/${getAppSlug(app.pubkey, app.dTag)}`;
  }
</script>

<svelte:head>
  {#if developer}
    <title
      >{developer.displayName || developer.name || "Profile"} - Zapstore</title
    >
    <meta
      name="description"
      content="Profile of {developer.displayName ||
        developer.name ||
        'this user'} on Zapstore."
    />
  {:else}
    <title>Profile - Zapstore</title>
  {/if}
</svelte:head>

<!-- Contextual header with back button and profile info -->
{#if developer}
  <DetailHeader
    publisherPic={developer.picture}
    publisherName={developer.displayName || developer.name}
    publisherPubkey={pubkey}
    publisherUrl="/p/{npub}"
    showPublisher={true}
  />
{:else if !loading && !error}
  <DetailHeader showPublisher={false} />
{/if}

{#if loading}
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="flex items-center justify-center py-24">
      <div class="text-center">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"
        ></div>
        <p class="text-muted-foreground">Loading profile...</p>
      </div>
    </div>
  </div>
{:else if error}
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="flex items-center justify-center py-24">
      <div class="text-center">
        <div
          class="rounded-lg bg-destructive/10 border border-destructive/20 p-6 max-w-md"
        >
          <User class="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-destructive mb-2">
            Profile Not Found
          </h3>
          <p class="text-muted-foreground mb-4">{error}</p>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
    <!-- Profile Header -->
    <div class="bg-card border border-border rounded-lg p-8 mb-8">
      <div class="flex items-center gap-6 mb-6">
        <ProfilePic
          pictureUrl={developer?.picture}
          name={developer?.displayName || developer?.name}
          {pubkey}
          size="2xl"
          className="flex-shrink-0"
        />
        <div class="min-w-0 flex-1 flex items-center">
          <div class="min-w-0">
            <h1 class="text-3xl lg:text-4xl font-black mb-2">
              {developer?.displayName || developer?.name || "Unknown User"}
            </h1>
            <p
              class="text-muted-foreground font-mono text-sm truncate"
              title={npub}
            >
              {npub}
            </p>
            <a
              href={`https://npub.world/${npub}`}
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs underline text-muted-foreground mt-1 inline-block"
            >
              Open in npub.world
            </a>
          </div>
        </div>
      </div>

      {#if developer?.about}
        <div
          class="text-muted-foreground mb-6 leading-relaxed developer-about text-[0.85rem]"
        >
          <NostrContent content={developer.about} />
        </div>
      {/if}

      <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {#if apps.length > 0}
          <div class="flex items-center gap-1">
            <Package class="h-4 w-4" />
            <span
              >{apps.length} published {apps.length === 1
                ? "app"
                : "apps"}</span
            >
          </div>
        {/if}
        {#if developer?.nip05}
          <div class="flex items-center gap-1">
            <Globe class="h-4 w-4" />
            <span>{developer.nip05}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Published Apps - only show if there are apps -->
    {#if apps.length > 0}
      <div class="mb-8">
        <h2 class="text-2xl font-extra-bold mb-6">Published Apps</h2>

        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {#each apps as app}
            <div
              class="group relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
            >
              <a href={getAppUrl(app)} class="block p-6">
                <!-- App Icon and Name -->
                <div class="flex items-center gap-4 mb-4">
                  <AppPic
                    iconUrl={app.icon}
                    name={app.name}
                    identifier={app.dTag}
                    size="md"
                  />
                  <div class="min-w-0 flex-1">
                    <h3
                      class="text-lg font-extra-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight"
                    >
                      {app.name}
                    </h3>
                    {#if appVersions.get(app.id)}
                      <div class="mt-0.5">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white max-w-[140px]"
                        >
                          <span class="truncate"
                            >{appVersions.get(app.id).length > 20
                              ? appVersions.get(app.id).slice(0, 20) + "…"
                              : appVersions.get(app.id)}</span
                          >
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Description -->
                <div class="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {@html app.descriptionHtml}
                </div>

                <!-- Date -->
                <div
                  class="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Calendar class="h-3 w-3" />
                  <span
                    >Updated {formatDate(app.createdAt, {
                      month: "short",
                    })}</span
                  >
                </div>
              </a>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Ensure long words/URLs wrap */
  .developer-about {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
</style>
