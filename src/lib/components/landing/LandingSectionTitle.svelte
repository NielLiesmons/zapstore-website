<script>
  import { ChevronRight } from "$lib/components/icons";

  export let title = "";
  export let description = "";
  export let showSeeMore = false;
  export let seeMoreAction = () => {};

  let seeMoreButton;

  function handleMouseMove(event) {
    if (!seeMoreButton) return;
    const rect = seeMoreButton.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    seeMoreButton.style.setProperty("--mouse-x", `${mouseX}px`);
    seeMoreButton.style.setProperty("--mouse-y", `${mouseY}px`);
  }
</script>

<div
  class="container mx-auto px-4 sm:px-6 lg:px-8 {description ? 'mb-8' : 'mb-4'}"
>
  <div class="flex items-start justify-between gap-4 flex-wrap">
    <div class="max-w-2xl">
      <h2
        class="section-title text-display-lg text-3xl sm:text-4xl lg:text-4xl xl:text-5xl leading-tight section-title-gradient mb-3"
      >
        {title}
      </h2>
      {#if description}
        <p class="section-description">
          {description}
        </p>
      {/if}
    </div>
    {#if showSeeMore}
      <button
        type="button"
        bind:this={seeMoreButton}
        on:click={seeMoreAction}
        on:mousemove={handleMouseMove}
        class="btn-glass-large btn-glass-with-chevron flex items-center flex-shrink-0 group"
      >
        See More
        <ChevronRight
          variant="outline"
          color="hsl(var(--white33))"
          size={18}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </button>
    {/if}
  </div>
</div>
