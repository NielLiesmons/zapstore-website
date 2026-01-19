<script>
  import { onMount } from "svelte";
  import { assets } from "$app/paths";
  import { ChevronRight, Code2 } from "$lib/components/icons";
  import SkeletonLoader from "$lib/components/SkeletonLoader.svelte";

  let heroButton;

  // Track loaded state for each icon image
  let loadedImages = {};
  let devButton;
  let mouseX = 0;
  let mouseY = 0;

  function handleMouseMove(event) {
    if (!heroButton) return;
    const rect = heroButton.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    heroButton.style.setProperty("--mouse-x", `${mouseX}px`);
    heroButton.style.setProperty("--mouse-y", `${mouseY}px`);
  }

  function handleDevButtonMouseMove(event) {
    if (!devButton) return;
    const rect = devButton.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    devButton.style.setProperty("--mouse-x", `${x}px`);
    devButton.style.setProperty("--mouse-y", `${y}px`);
  }

  let scrollY = 0;
  let heroElement;
  let windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;

  // Icon configuration array - edit this to control each icon's properties
  // Position (x, y) is relative to the center of the section
  // Size is a scale multiplier (1.0 = base size, larger = bigger)
  // Rotation is in degrees
  // Parallax speed and opacity are automatically calculated based on size
  // Spread over full width and height, filling corners and center, extending beyond bottom edge
  export let iconConfigs = [
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -400,
      y: -170,
      size: 2.1,
      rotationX: 12,
      rotationY: -15,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 380,
      y: -190,
      size: 2.1,
      rotationX: 20,
      rotationY: 14,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: -456,
      y: 150,
      size: 2,
      rotationX: -20,
      rotationY: -20,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: 470,
      y: 160,
      size: 2.1,
      rotationX: -16,
      rotationY: 16,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: -105,
      y: -310,
      size: 1.9,
      rotationX: 25,
      rotationY: -22,
    },
    // Icons 6-80: cycling through the first 5 URLs
    // URL cycle: [0] chachi, [1] satellite, [2] zapstore1, [3] zapstore2, [4] blossom
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -580,
      y: 450,
      size: 2.4,
      rotationX: 15,
      rotationY: 20,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 600,
      y: 380,
      size: 2.4,
      rotationX: 15,
      rotationY: -20,
    },
    // Icons 8-80: literal grid with standard jumps, explosion effect from center
    // Grid spacing: 120px horizontal, 100px vertical
    // Center zone (-200 to +200): extra density for explosion effect
    // Grid columns: -840, -720, -600, -480, -360, -240, -120, 0, 120, 240, 360, 480, 600, 720, 840
    // Grid rows: -400, -300, -200, -100, 0, 100, 200, 300, 400, 500, 600
    // Grid-based icons - outer edges first
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: -840,
      y: -400,
      size: 1.6,
      rotationX: -20,
      rotationY: 25,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: 840,
      y: -400,
      size: 1.5,
      rotationX: -18,
      rotationY: -22,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: -840,
      y: 600,
      size: 1.4,
      rotationX: 20,
      rotationY: 18,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: 840,
      y: 600,
      size: 1.3,
      rotationX: 18,
      rotationY: -20,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: -720,
      y: -300,
      size: 1.8,
      rotationX: 20,
      rotationY: -15,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: 720,
      y: -300,
      size: 1.8,
      rotationX: 20,
      rotationY: 15,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -720,
      y: 500,
      size: 1.7,
      rotationX: -20,
      rotationY: 25,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 720,
      y: 500,
      size: 1.7,
      rotationX: -20,
      rotationY: -25,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: -600,
      y: -200,
      size: 1.6,
      rotationX: 18,
      rotationY: -18,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: 600,
      y: -200,
      size: 1.6,
      rotationX: 18,
      rotationY: 18,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: -600,
      y: 400,
      size: 1.5,
      rotationX: 12,
      rotationY: -12,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: 600,
      y: 400,
      size: 1.4,
      rotationX: -10,
      rotationY: 15,
    },
    // Removed icons too close to first 5 icons (x: -480 to -360 and 360 to 480 area)
    // Removed most center zone icons (x: -120 to +120, y: -200 to +400) to reduce crowding
    // More grid positions - continuing outer grid
    // Removed icon at -840, -300 (too close to -840, -400 and -720, -300)
    // Removed a few outer left/right icons
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: -840,
      y: 0,
      size: 1.2,
      rotationX: 16,
      rotationY: 22,
    },
    // Removed one more outer left icon
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 840,
      y: 300,
      size: 0.95,
      rotationX: -10,
      rotationY: -16,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: -720,
      y: -100,
      size: 0.9,
      rotationX: 12,
      rotationY: 15,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: 720,
      y: -100,
      size: 0.85,
      rotationX: 10,
      rotationY: -14,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: -720,
      y: 100,
      size: 0.8,
      rotationX: -8,
      rotationY: 12,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: 720,
      y: 100,
      size: 0.75,
      rotationX: -6,
      rotationY: -10,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: -600,
      y: -300,
      size: 0.7,
      rotationX: 8,
      rotationY: 8,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: 600,
      y: -300,
      size: 0.65,
      rotationX: 6,
      rotationY: -6,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: -600,
      y: 500,
      size: 0.6,
      rotationX: -20,
      rotationY: 25,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: 600,
      y: 500,
      size: 0.55,
      rotationX: -22,
      rotationY: -23,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -380,
      y: -10,
      size: 1.3,
      rotationX: 18,
      rotationY: 20,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 380,
      y: -10,
      size: 1.2,
      rotationX: 16,
      rotationY: -18,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: -480,
      y: 400,
      size: 1.1,
      rotationX: -14,
      rotationY: 16,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: 480,
      y: 400,
      size: 1.0,
      rotationX: -12,
      rotationY: -14,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: -360,
      y: -400,
      size: 0.95,
      rotationX: 10,
      rotationY: 12,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: 360,
      y: -400,
      size: 0.9,
      rotationX: 8,
      rotationY: -10,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: -360,
      y: 300,
      size: 0.85,
      rotationX: -6,
      rotationY: 8,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: 360,
      y: 300,
      size: 0.8,
      rotationX: -4,
      rotationY: -6,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: -240,
      y: -400,
      size: 0.75,
      rotationX: 4,
      rotationY: 4,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: 240,
      y: -400,
      size: 0.7,
      rotationX: 2,
      rotationY: -2,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -240,
      y: 0,
      size: 0.65,
      rotationX: -2,
      rotationY: 2,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 240,
      y: 0,
      size: 0.6,
      rotationX: -1,
      rotationY: -1,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: -240,
      y: 300,
      size: 0.55,
      rotationX: 1,
      rotationY: 1,
    },
    // Removed most center zone explosion icons to reduce crowding
    // Removed smaller outer grid icons and remaining center zone icons
    // Additional icons in safe areas (far from first 5 icons)
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: -840,
      y: -200,
      size: 0.6,
      rotationX: 5,
      rotationY: -5,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: 840,
      y: -200,
      size: 0.6,
      rotationX: -5,
      rotationY: 5,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -840,
      y: 200,
      size: 0.6,
      rotationX: 4,
      rotationY: -4,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 840,
      y: 200,
      size: 0.6,
      rotationX: -4,
      rotationY: 4,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: -600,
      y: -400,
      size: 0.55,
      rotationX: 3,
      rotationY: -3,
    },
    // Five small icons in center zone - spread out further from center
    {
      imageUrl: `https://cdn.zapstore.dev/445aa6a39feeeee6be4aac4fe46b29cb57ebc70abd75e481c58f2145bbe5439f`,
      x: -190,
      y: -180,
      size: 0.5,
      rotationX: 2,
      rotationY: -2,
    },
    {
      imageUrl: `https://blossom.primal.net/0444bf8f340786d7021050a216f0401e51656d8ec3c32c04e94c8c46a1cdb5ce.png`,
      x: 190,
      y: -180,
      size: 0.5,
      rotationX: -2,
      rotationY: 2,
    },
    {
      imageUrl: `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://chachi.chat/&size=256`,
      x: -190,
      y: 180,
      size: 0.5,
      rotationX: 1,
      rotationY: -1,
    },
    {
      imageUrl: `https://cdn.satellite.earth/cb72c77cd77b6de306e30092eb66edf2271afb85a05852e19e94188d8b83c520.png`,
      x: 190,
      y: 180,
      size: 0.5,
      rotationX: -1,
      rotationY: 1,
    },
    {
      imageUrl: `https://cdn.zapstore.dev/1199867abd495cf2315d84880763f2ea44badfa2a32831d25b8e62c72a491e05`,
      x: 0,
      y: -190,
      size: 0.5,
      rotationX: 1,
      rotationY: -1,
    },
  ];

  // Calculate parallax speed based on size
  // Larger icons move faster (closer to viewer), smaller icons move slower (farther away)
  function calculateParallaxSpeed(size) {
    // Map size (0.5-2.8) to parallax speed (0.15-0.9)
    // Linear interpolation: larger = faster parallax
    const minSize = 0.5;
    const maxSize = 2.8;
    const minSpeed = 0.15;
    const maxSpeed = 0.9;
    const normalizedSize = Math.max(minSize, Math.min(maxSize, size));
    const speed =
      minSpeed +
      ((normalizedSize - minSize) / (maxSize - minSize)) *
        (maxSpeed - minSpeed);
    return speed;
  }

  // Calculate opacity based on size
  // Smaller icons get less opacity (min 33%)
  function calculateOpacity(size) {
    // Map size (0.5-2.8) to opacity (0.33-1.0)
    // Linear interpolation: smaller = less opacity
    const minSize = 0.5;
    const maxSize = 2.8;
    const minOpacity = 0.33;
    const maxOpacity = 1.0;
    const normalizedSize = Math.max(minSize, Math.min(maxSize, size));
    const opacity =
      minOpacity +
      ((normalizedSize - minSize) / (maxSize - minSize)) *
        (maxOpacity - minOpacity);
    return opacity;
  }

  // Calculate blur based on size
  // Base size is 1.9 (no blur)
  // Same blur factor for both larger and smaller sizes
  function calculateBlur(size) {
    const baseSize = 1.9;
    const sizeDifference = Math.abs(size - baseSize);
    // Use same factor for both directions: 1.2px blur per unit difference
    return sizeDifference * 1.2;
  }

  $: iconPositions = iconConfigs.map((config) => {
    return {
      ...config,
      parallaxSpeed: calculateParallaxSpeed(config.size),
      opacity: calculateOpacity(config.size),
      blur: calculateBlur(config.size),
    };
  });

  function handleResize() {
    windowWidth = window.innerWidth;
  }

  function handleScroll() {
    if (heroElement) {
      const rect = heroElement.getBoundingClientRect();
      // Calculate scroll based on hero's position in viewport
      // Start parallax as soon as hero enters viewport (top of hero reaches top of viewport)
      // Use window.scrollY directly for immediate parallax effect
      scrollY = window.scrollY;
    }
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    handleScroll();
    handleResize();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  });
</script>

<section
  bind:this={heroElement}
  class="relative h-[450px] sm:h-[500px] md:h-[540px] lg:h-[580px] flex items-center justify-center overflow-hidden"
  style="perspective: 2000px; perspective-origin: center center;"
>
  <!-- Background gradient orbs -->
  <div
    class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] gradient-orb bg-primary/20"
  ></div>
  <div
    class="absolute top-40 right-1/3 w-[400px] h-[400px] gradient-orb bg-primary/10"
    style="animation-delay: -4s;"
  ></div>
  <div
    class="absolute bottom-0 right-0 w-[500px] h-[500px] gradient-orb bg-primary/15"
    style="animation-delay: -2s;"
  ></div>

  <!-- Left gradient fade -->
  <div
    class="hidden md:block absolute left-0 top-0 bottom-0 w-24 sm:w-32 md:w-48 lg:w-64 xl:w-80 z-20 pointer-events-none"
    style="background: linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 20%, hsl(var(--background) / 0.45) 50%, transparent 100%);"
  ></div>

  <!-- Right gradient fade -->
  <div
    class="hidden md:block absolute right-0 top-0 bottom-0 w-24 sm:w-32 md:w-48 lg:w-64 xl:w-80 z-20 pointer-events-none"
    style="background: linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 20%, hsl(var(--background) / 0.45) 50%, transparent 100%);"
  ></div>

  <!-- App icons with parallax - positioned relative to center -->
  <div
    class="absolute inset-0 pointer-events-none"
    style="transform-style: preserve-3d;"
  >
    {#each iconPositions as iconData}
      {@const parallaxOffset = -scrollY * iconData.parallaxSpeed}
      {@const baseSize = Math.max(30, (windowWidth / 100) * 3.5)}
      {@const scaledSize = baseSize * iconData.size}
      {@const borderRadius = baseSize * 0.24}
      {@const positionScale = 1.0 + (windowWidth / 1920 - 1) * 0.6}
      {@const scaledX = iconData.x * positionScale}
      {@const scaledY = iconData.y * positionScale}
      {@const thicknessSpread = 1}
      {@const thicknessOffsetMultiplier = Math.max(
        8,
        (windowWidth / 100) * 0.6,
      )}
      {@const thicknessOffsetX =
        Math.sin((iconData.rotationY * Math.PI) / 180) *
        thicknessOffsetMultiplier}
      {@const thicknessOffsetY =
        -Math.sin((iconData.rotationX * Math.PI) / 180) *
        thicknessOffsetMultiplier}
      {@const translateZ =
        iconData.size > 2.0
          ? 150
          : iconData.size > 1.5
            ? 120
            : iconData.size > 1.0
              ? 100
              : iconData.size > 0.8
                ? 0
                : -100}
      <div
        class="absolute flex items-center justify-center"
        style="
          left: 50%;
          top: 50%;
          transform: 
            translate(-50%, -50%)
            translateX({scaledX}px)
            translateY({parallaxOffset + scaledY}px)
            translateZ({translateZ}px)
            rotateX({iconData.rotationX}deg)
            rotateY({iconData.rotationY}deg)
            scale({iconData.size});
          transform-style: preserve-3d;
          opacity: {iconData.opacity};
          filter: blur({iconData.blur}px);
        "
      >
        <!-- Icon image with thickness shadow - maintain 2D appearance -->
        <div
          class="relative overflow-hidden border-subtle"
          style="
            width: {baseSize}px;
            height: {baseSize}px;
            border-radius: {borderRadius}px;
            transform: translateZ(0);
            transform-style: preserve-3d;
            box-shadow: {thicknessOffsetX}px {thicknessOffsetY}px 0 {thicknessSpread}px hsl(var(--white8));
          "
        >
          <!-- Skeleton loader while image loads -->
          {#if !loadedImages[iconData.imageUrl]}
            <div class="absolute inset-0 overflow-hidden">
              <SkeletonLoader />
            </div>
          {/if}
          <img
            src={iconData.imageUrl}
            alt="App icon"
            class="w-full h-full object-cover transition-opacity duration-300"
            class:opacity-0={!loadedImages[iconData.imageUrl]}
            style="
              backface-visibility: hidden;
              transform: translateZ(0);
            "
            on:load={() => (loadedImages[iconData.imageUrl] = true)}
          />
        </div>
      </div>
    {/each}
  </div>

  <!-- Central text -->
  <div class="relative z-10 text-center px-4">
    <h1
      class="text-display-lg text-4xl sm:text-6xl lg:text-7xl xl:text-8xl leading-tight mb-6"
    >
      <span
        style="background: var(--gradient-gray); -webkit-background-clip: text; background-clip: text; color: transparent;"
      >
        Apps.
      </span>
      <br />
      <span
        style="background: var(--gradient-blurple-light); -webkit-background-clip: text; background-clip: text; color: transparent;"
      >
        Released.
      </span>
    </h1>
    <p class="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
      Finally, an open app store for freely sharing apps
    </p>
    <a
      href="/apps"
      bind:this={heroButton}
      class="btn-glass-large btn-glass-with-chevron flex items-center group"
      on:mousemove={handleMouseMove}
    >
      Discover Apps
      <ChevronRight
        variant="outline"
        color="hsl(var(--white33))"
        size={18}
        className="transition-transform group-hover:translate-x-0.5"
      />
    </a>
  </div>

  <!-- Developer button anchored to bottom -->
  <button
    type="button"
    bind:this={devButton}
    on:mousemove={handleDevButtonMouseMove}
    class="dev-button-bottom btn-glass-small btn-glass-green-hover flex items-center justify-center gap-2 text-sm"
  >
    <span class="btn-icon-green flex items-center">
      <Code2 variant="outline" size={14} color="currentColor" />
    </span>
    <span class="btn-text-white">For Developers</span>
  </button>
</section>

<style>
  .gradient-orb {
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.6;
    animation: float 20s ease-in-out infinite;
  }

  @keyframes float {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(30px, -30px) scale(1.1);
    }
  }

  .dev-button-bottom {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    height: 40px !important;
    width: 360px !important;
    padding-bottom: 1px !important;
    background-color: rgb(0 0 0 / 0.33) !important;
    border-top-left-radius: 24px !important;
    border-top-right-radius: 24px !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    border-bottom: none !important;
  }

  .dev-button-bottom:hover {
    transform: translateX(-50%) scale(1.025);
  }

  .dev-button-bottom:active {
    transform: translateX(-50%) scale(0.98);
  }

  @media (max-width: 639px) {
    .dev-button-bottom {
      width: 100% !important;
      left: 0;
      transform: none;
      border-radius: 0 !important;
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
      border-left: none !important;
      border-right: none !important;
    }

    .dev-button-bottom:hover {
      transform: none;
    }

    .dev-button-bottom:active {
      transform: none;
    }
  }

  .btn-text-white {
    transition: color 0.3s ease;
    color: hsl(var(--white66));
  }

  .dev-button-bottom:hover .btn-text-white {
    color: hsl(var(--foreground));
  }
</style>
