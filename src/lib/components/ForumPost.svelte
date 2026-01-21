<script>
  import Label from "./Label.svelte";
  import ProfilePic from "./ProfilePic.svelte";
  import Timestamp from "./Timestamp.svelte";

  /**
   * Forum Post Component
   * Displays a forum post card similar to testimonial cards
   * with a title and scrollable labels at the bottom
   */

  export let author = {
    name: "",
    picture: "",
    npub: "",
  };
  export let title = "";
  export let content = "";
  export let timestamp = "";
  export let labels = []; // Array of label text strings
  export let onClick = () => {};

  function getDisplayName() {
    return author.name || author.npub?.slice(0, 12) + "..." || "Anonymous";
  }
</script>

<div
  class="forum-post-card group"
  on:click={onClick}
  on:keydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }}
  role="button"
  tabindex="0"
>
  <div class="card-content">
    <!-- Top row: Profile pic, name, date/time -->
    <div class="flex items-center gap-3 mb-3">
      <ProfilePic
        pictureUrl={author.picture}
        name={author.name || author.npub}
        size="lg"
      />

      <div class="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span
          class="font-semibold truncate text-base"
          style="color: hsl(var(--white66));"
        >
          {getDisplayName()}
        </span>
        <Timestamp {timestamp} size="xs" />
      </div>
    </div>

    <!-- Title -->
    {#if title}
      <h3 class="text-lg font-semibold mb-2 line-clamp-2 text-foreground">
        {title}
      </h3>
    {/if}

    <!-- Content -->
    {#if content}
      <p
        class="text-base leading-relaxed whitespace-pre-wrap mb-0 line-clamp-3"
        style="color: hsl(var(--white66));"
      >
        {content}
      </p>
    {/if}
  </div>

  <!-- Labels row -->
  {#if labels && labels.length > 0}
    <div class="labels-container scrollbar-hide">
      <div class="flex gap-2">
        {#each labels as label}
          <div class="flex-shrink-0">
            <Label text={label} isSelected={false} isEmphasized={false} />
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .forum-post-card {
    display: block;
    background: hsl(var(--gray44));
    border: 1px solid hsl(var(--border) / 0.4);
    border-radius: 1.25rem;
    transition: transform 0.2s ease;
    cursor: pointer;
    height: fit-content;
    overflow: hidden;
  }

  .card-content {
    padding: 1rem;
  }

  .labels-container {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
    overflow-x: auto;
    /* Fade mask: opaque in center, transparent at edges */
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 1rem,
      black calc(100% - 1rem),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 1rem,
      black calc(100% - 1rem),
      transparent 100%
    );
  }

  .forum-post-card:hover {
    transform: scale(1.01);
  }

  .forum-post-card:active {
    transform: scale(0.99);
  }

  .forum-post-card:focus {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
