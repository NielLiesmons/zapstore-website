<script>
  import { onMount } from "svelte";
  import { MessageSquare, Loader2, AlertCircle, LogIn } from "lucide-svelte";
  import {
    fetchAppComments,
    formatDate,
    publishAppComment,
    fetchProfile,
    getCachedComments,
    cacheComments,
  } from "$lib/nostr.js";
  import { authStore, connect } from "$lib/stores/auth.js";
  import ProfilePic from "./ProfilePic.svelte";

  export let app;
  export let version = "";

  let comments = [];
  let loading = true;
  let error = "";
  let commentText = "";
  let submitting = false;
  let profiles = {};

  const MAX_LENGTH = 1000;

  onMount(() => {
    loadComments();
  });

  async function loadComments() {
    if (!app?.pubkey || !app?.dTag) return;
    error = "";

    let cachedComments = null;
    let shouldLoadProfiles = false;

    // Try cached comments first for instant UI
    try {
      cachedComments = await getCachedComments(app.pubkey, app.dTag);
      if (cachedComments?.length) {
        comments = cachedComments;
        loading = false;
        shouldLoadProfiles = true;
      }
    } catch (e) {
      // Ignore cache errors
    }

    if (!cachedComments?.length) {
      loading = true;
    }

    try {
      const freshComments = await fetchAppComments(app.pubkey, app.dTag);
      comments = freshComments;
      cacheComments(app.pubkey, app.dTag, freshComments);
      shouldLoadProfiles = true;
    } catch (err) {
      console.error("Failed to load comments", err);
      error = err?.message || "Failed to load comments.";
    } finally {
      if (shouldLoadProfiles && comments.length > 0) {
        // Fetch profiles for all comment authors
        await loadProfiles();
      }
      loading = false;
    }
  }

  async function loadProfiles() {
    const uniquePubkeys = [...new Set(comments.map((c) => c.pubkey))];
    const fetchPromises = uniquePubkeys.map(async (pubkey) => {
      if (!profiles[pubkey]) {
        try {
          const profile = await fetchProfile(pubkey);
          if (profile) {
            profiles[pubkey] = profile;
            profiles = profiles; // trigger reactivity
          }
        } catch (e) {
          // Silently fail for individual profile fetches
        }
      }
    });
    await Promise.allSettled(fetchPromises);
  }

  function getDisplayName(pubkey, npub) {
    const profile = profiles[pubkey];
    if (profile?.displayName) return profile.displayName;
    if (profile?.name) return profile.name;
    // Fallback to truncated npub
    return npub ? `${npub.slice(0, 12)}...` : "Anonymous";
  }

  function getAvatar(pubkey) {
    return profiles[pubkey]?.picture || null;
  }

  async function handleSignIn() {
    error = "";
    try {
      await connect();
    } catch (err) {
      console.error("Failed to sign in", err);
      error = err?.message || "Failed to sign in. Please try again.";
    }
  }

  $: canSubmit =
    !!commentText.trim() && $authStore.isConnected && !!version && !submitting;

  async function submitComment() {
    if (!canSubmit) return;
    submitting = true;
    error = "";

    try {
      await publishAppComment(
        app,
        commentText.slice(0, MAX_LENGTH),
        window.nostr,
        version,
      );
      commentText = "";
      await loadComments();
    } catch (err) {
      console.error("Failed to publish comment", err);
      error = err?.message || "Failed to publish comment.";
    } finally {
      submitting = false;
    }
  }

  // Get display name for current user
  $: currentUserDisplay =
    $authStore.profile?.displayName ||
    $authStore.profile?.name ||
    ($authStore.npub ? `${$authStore.npub.slice(0, 12)}...` : "");
</script>

<div class="flex items-center gap-2 mb-4">
  <MessageSquare class="h-5 w-5 text-primary" />
  <h2 class="text-xl font-bold">Comments</h2>
</div>

{#if error}
  <div
    class="mb-4 flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
  >
    <AlertCircle class="h-4 w-4 mt-0.5" />
    <div class="flex-1">{error}</div>
  </div>
{/if}

{#if loading}
  <div class="flex items-center gap-3 text-sm text-muted-foreground">
    <Loader2 class="h-4 w-4 animate-spin" />
    <span>Loading comments...</span>
  </div>
{:else if comments.length === 0}
  <p class="text-sm text-muted-foreground">
    No comments yet. Be the first to share feedback.
  </p>
{:else}
  <div class="space-y-0">
    {#each comments as comment, i}
      <article class="py-4 {i > 0 ? 'border-t border-border/30' : ''}">
        <div class="flex gap-3">
          <!-- Avatar -->
          <a
            href="/p/{comment.npub}"
            class="flex-shrink-0 block hover:opacity-80 transition-opacity"
          >
            <ProfilePic
              pictureUrl={getAvatar(comment.pubkey)}
              name={getDisplayName(comment.pubkey, comment.npub)}
              pubkey={comment.pubkey}
              size="lg"
            />
          </a>

          <!-- Comment body -->
          <div class="flex-1 min-w-0 pt-0.5">
            <!-- Author, version & timestamp -->
            <div class="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
              <a
                href="/p/{comment.npub}"
                class="font-semibold text-sm text-foreground hover:text-primary transition-colors"
              >
                {getDisplayName(comment.pubkey, comment.npub)}
              </a>
              {#if comment.version}
                <span class="text-xs text-muted-foreground/50">on</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white"
                >
                  {comment.version}
                </span>
              {/if}
              <span class="text-muted-foreground/60">·</span>
              <time class="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </time>
            </div>

            <!-- Comment content -->
            <div
              class="text-sm text-foreground/85 leading-relaxed [&>p]:m-0 [&>p+p]:mt-2"
            >
              {@html comment.contentHtml ||
                "<p class='text-muted-foreground italic'>No content</p>"}
            </div>
          </div>
        </div>
      </article>
    {/each}
  </div>
{/if}

<div class="mt-6 pt-4 border-t border-border/60">
  {#if $authStore.isConnecting}
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" />
      <span>Connecting...</span>
    </div>
  {:else if !$authStore.isConnected}
    <div class="flex items-center gap-3">
      <button
        type="button"
        on:click={handleSignIn}
        class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <LogIn class="h-4 w-4" />
        Sign in to comment
      </button>
      <span class="text-sm text-muted-foreground">
        Requires a Nostr extension
      </span>
    </div>
  {:else}
    <!-- Signed in user info -->
    <div class="flex items-center gap-2 mb-3">
      <ProfilePic
        pictureUrl={$authStore.profile?.picture}
        name={$authStore.profile?.displayName || $authStore.profile?.name}
        pubkey={$authStore.pubkey}
        size="sm"
      />
      <span class="text-sm text-muted-foreground">
        Commenting as <span class="font-medium text-foreground"
          >{currentUserDisplay}</span
        >
      </span>
    </div>

    <div class="space-y-3">
      <textarea
        bind:value={commentText}
        maxlength={MAX_LENGTH}
        rows="3"
        placeholder="Share your experience or feedback..."
        class="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      ></textarea>
      <div
        class="flex items-center justify-between text-xs text-muted-foreground"
      >
        <span>{commentText.length}/{MAX_LENGTH} characters</span>
        <button
          type="button"
          on:click={submitComment}
          disabled={!canSubmit}
          class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {#if submitting}
            <Loader2 class="h-4 w-4 animate-spin" />
            Posting...
          {:else}
            <MessageSquare class="h-4 w-4" />
            Post Comment
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
