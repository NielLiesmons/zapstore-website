<script>
	import { ChevronRight } from "$lib/components/icons";

	let publishButton;

	function handleMouseMove(event) {
		if (!publishButton) return;
		const rect = publishButton.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;
		publishButton.style.setProperty("--mouse-x", `${mouseX}px`);
		publishButton.style.setProperty("--mouse-y", `${mouseY}px`);
	}
</script>

<svelte:head>
	<title>Developers — Zapstore</title>
	<meta name="description" content="No hassle. Yes Insights. Publish your app on Zapstore." />
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden">
	<!-- Background gradient orbs -->
	<div
		class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] gradient-orb bg-[#19DD75]/20"
	></div>
	<div
		class="absolute top-40 right-1/3 w-[400px] h-[400px] gradient-orb bg-[#0BBB8C]/10"
		style="animation-delay: -4s;"
	></div>

	<div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 lg:pt-24 pb-0">
		<!-- Center text - Landing page style header -->
		<div class="relative z-20 text-center mb-12 lg:mb-16">
			<h1 class="text-display-lg leading-tight mb-6">
				<span class="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl block mb-2">
					<span
						style="background: var(--gradient-gray); -webkit-background-clip: text; background-clip: text; color: transparent;"
					>
						No hassle.
					</span>
				</span>
				<span class="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl block">
					<span
						style="background: var(--gradient-green); -webkit-background-clip: text; background-clip: text; color: transparent;"
					>
						Yes Insights.
					</span>
				</span>
			</h1>
			<p class="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto">
				Zapstore Hub: Publish, manage, and grow your apps
			</p>
		</div>

		<!-- Preview container - styled like ZapTheAppSection -->
		<div
			class="preview-content rounded-t-[32px] relative overflow-hidden preview-container-border preview-bg"
		>
			<!-- Hub Preview placeholder - replace with actual image later -->
			<div class="hub-preview-area relative">
				<!-- Placeholder grid pattern to simulate dashboard UI -->
				<div class="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:40px_40px]"></div>
				
				<!-- Simulated dashboard elements -->
				<div class="dashboard-mock">
					<!-- Top stats row -->
					<div class="flex gap-4 mb-6 px-8 pt-8">
						<div class="stat-card flex-1">
							<div class="stat-label">Total Installs</div>
							<div class="stat-value">12,438</div>
							<div class="stat-delta positive">+8.2%</div>
						</div>
						<div class="stat-card flex-1">
							<div class="stat-label">Active Users</div>
							<div class="stat-value">3,219</div>
							<div class="stat-delta positive">+12.5%</div>
						</div>
						<div class="stat-card flex-1">
							<div class="stat-label">Zaps Received</div>
							<div class="stat-value">847k sats</div>
							<div class="stat-delta positive">+24.1%</div>
						</div>
						<div class="stat-card flex-1">
							<div class="stat-label">App Rating</div>
							<div class="stat-value">4.8</div>
							<div class="stat-delta positive">+0.2</div>
						</div>
					</div>
					
					<!-- Chart area placeholder -->
					<div class="chart-area mx-8 mb-6">
						<div class="chart-header">
							<span class="chart-title">Install Trends</span>
							<span class="chart-period">Last 30 days</span>
						</div>
						<div class="chart-placeholder">
							<svg viewBox="0 0 400 100" class="w-full h-full" preserveAspectRatio="none">
								<defs>
									<linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" style="stop-color:#19DD75;stop-opacity:0.3" />
										<stop offset="100%" style="stop-color:#19DD75;stop-opacity:0" />
									</linearGradient>
								</defs>
								<path 
									d="M0,80 Q50,70 100,60 T200,40 T300,30 T400,20 L400,100 L0,100 Z" 
									fill="url(#chartGradient)"
								/>
								<path 
									d="M0,80 Q50,70 100,60 T200,40 T300,30 T400,20" 
									fill="none" 
									stroke="#19DD75" 
									stroke-width="2"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Publish Your App Button - overlayed on preview -->
			<a
				href="/docs/publish"
				bind:this={publishButton}
				on:mousemove={handleMouseMove}
				class="absolute bottom-8 left-1/2 transform -translate-x-1/2 btn-glass-large btn-glass-green btn-glass-with-chevron flex items-center group z-40"
			>
				Publish Your App
				<ChevronRight
					variant="outline"
					color="#19DD75"
					size={18}
					className="transition-transform group-hover:translate-x-0.5"
				/>
			</a>
		</div>
	</div>
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
			transform: translate(-50%, 0) scale(1);
		}
		50% {
			transform: translate(-50%, -30px) scale(1.1);
		}
	}

	.preview-bg {
		background: linear-gradient(
			to bottom,
			hsl(var(--gray33)) 0%,
			hsl(var(--gray) / 0.08) 100%
		);
	}

	.preview-container-border {
		border: var(--border-base) solid hsl(var(--white8));
		border-bottom: none;
	}

	.hub-preview-area {
		min-height: 400px;
		padding-bottom: 80px; /* Space for the button */
	}

	/* Dashboard mock styles */
	.dashboard-mock {
		position: relative;
		z-index: 10;
	}

	.stat-card {
		background: hsl(var(--card) / 0.5);
		border: 1px solid hsl(var(--white8));
		border-radius: 16px;
		padding: 16px 20px;
		backdrop-filter: blur(8px);
	}

	.stat-label {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		margin-bottom: 4px;
	}

	.stat-value {
		font-size: 24px;
		font-weight: 600;
		color: hsl(var(--foreground));
		line-height: 1.2;
	}

	.stat-delta {
		font-size: 12px;
		margin-top: 4px;
	}

	.stat-delta.positive {
		color: #19DD75;
	}

	.chart-area {
		background: hsl(var(--card) / 0.5);
		border: 1px solid hsl(var(--white8));
		border-radius: 16px;
		padding: 20px;
		backdrop-filter: blur(8px);
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.chart-title {
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.chart-period {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.chart-placeholder {
		height: 100px;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.dashboard-mock .flex {
			flex-wrap: wrap;
		}

		.stat-card {
			flex: 1 1 calc(50% - 8px);
			min-width: calc(50% - 8px);
		}

		.hub-preview-area {
			min-height: 350px;
		}
	}

	@media (max-width: 480px) {
		.stat-card {
			flex: 1 1 100%;
		}

		.dashboard-mock .flex {
			flex-direction: column;
			gap: 12px;
		}

		.hub-preview-area {
			min-height: 500px;
		}
	}
</style>
