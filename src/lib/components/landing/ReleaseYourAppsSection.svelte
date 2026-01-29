<script>
  import { ChevronRight } from "$lib/components/icons";

  let ctaButton;

  function handleMouseMove(event) {
    if (!ctaButton) return;
    const rect = ctaButton.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    ctaButton.style.setProperty("--mouse-x", `${mouseX}px`);
    ctaButton.style.setProperty("--mouse-y", `${mouseY}px`);
  }
</script>

<section class="relative border-t border-border/50 overflow-hidden">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-20 pb-0">
    <!-- Center text -->
    <div class="relative z-20 text-center mb-8">
      <h2 class="section-title text-display-lg leading-tight">
        <span
          class="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl section-title-gradient"
        >
          Release with ease
        </span>
      </h2>
      <p class="section-description max-w-2xl mx-auto mt-7">
        Publish apps directly to users without gatekeepers. <br />Get insights,
        monetize and build community.
      </p>
    </div>

    <!-- Preview container -->
    <div
      class="preview-content rounded-t-[32px] relative overflow-hidden preview-container-border preview-bg"
    >
      <!-- Preview image placeholder -->
      <div class="h-64 flex items-center justify-center">
        <span class="text-sm text-muted-foreground"
          >Developer suite preview</span
        >
      </div>
      <!-- CTA Button - 32px from bottom edge -->
      <a
        href="/developers"
        bind:this={ctaButton}
        on:mousemove={handleMouseMove}
        class="absolute bottom-8 left-1/2 transform -translate-x-1/2 btn-glass-large btn-glass-with-chevron flex items-center group z-40"
      >
        Start Publishing
        <ChevronRight
          variant="outline"
          color="hsl(var(--white33))"
          size={18}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </a>
    </div>
  </div>
</section>

<style>
  .preview-bg {
    background: linear-gradient(
      to bottom,
      hsl(var(--gray33)) 0%,
      hsl(var(--gray) / 0.08) 100%
    );
  }

  .preview-container-border {
    border: var(--border-base) solid hsl(var(--white8));
  }
</style>
