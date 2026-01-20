<script>
  import { onMount } from "svelte";
  import { fetchProfile } from "$lib/nostr.js";
  import ProfilePic from "./ProfilePic.svelte";

  export let pubkey;
  export let npub = "";
  export let size = "sm"; // 'xs', 'sm' or 'lg'
  export let showLabel = true; // Whether to show "Published by:" label
  export let disableLink = false; // Whether to disable the link functionality

  let profile = null;
  let loading = true;

  onMount(async () => {
    if (pubkey) {
      try {
        profile = await fetchProfile(pubkey);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
      loading = false;
    }
  });

  // Truncate npub for fallback display
  $: truncatedNpub = npub ? `${npub.slice(0, 12)}...${npub.slice(-6)}` : "";
  $: displayName = profile?.displayName || profile?.name || truncatedNpub;
  $: avatarUrl = profile?.picture || "";
  $: profileUrl = npub ? `/p/${npub}` : "#";
  $: shouldShowProfile =
    !loading &&
    pubkey !==
      "78ce6faa72264387284e647ba6938995735ec8c7d5c5a65737e55130f026307d";

  // Map size to ProfilePic size
  $: profilePicSize = size === "lg" ? "lg" : size === "sm" ? "md" : "xs";
  $: labelClass =
    size === "lg"
      ? "text-sm text-muted-foreground"
      : "text-xs text-muted-foreground";
  $: nameClass =
    size === "lg"
      ? "font-bold text-foreground text-base"
      : size === "sm"
        ? "font-medium text-foreground text-sm"
        : size === "xs"
          ? "font-medium text-foreground text-sm"
          : "font-medium text-foreground text-xs";
</script>

{#if shouldShowProfile}
  {#if disableLink}
    <div class="flex items-center gap-2">
      {#if showLabel}
        <span class={labelClass}>Published by:</span>
      {/if}

      <!-- Avatar -->
      <ProfilePic
        pictureUrl={avatarUrl}
        name={displayName}
        {pubkey}
        size={profilePicSize}
      />

      <!-- Profile Name -->
      <div class="min-w-0 flex-1">
        <div class={nameClass}>
          {displayName}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex items-center gap-2">
      {#if showLabel}
        <span class={labelClass}>Published by:</span>
      {/if}

      <a
        href={profileUrl}
        class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <!-- Avatar -->
        <ProfilePic
          pictureUrl={avatarUrl}
          name={displayName}
          {pubkey}
          size={profilePicSize}
        />

        <!-- Profile Name -->
        <div class="min-w-0 flex-1">
          <div class={nameClass}>
            {displayName}
          </div>
        </div>
      </a>
    </div>
  {/if}
{/if}
