<script lang="ts">
  import { onMount } from "svelte";

  type Dispose = () => void;

  type ThreeAttribute = {
    needsUpdate?: boolean;
  };

  type ThreeGeometry = {
    attributes: {
      position: ThreeAttribute;
    };
    setAttribute(name: string, attribute: ThreeAttribute): void;
    dispose(): void;
  };

  type ThreeMaterial = {
    opacity?: number;
    dispose(): void;
    clone(): ThreeMaterial;
  };

  type ThreeObject3D = {
    rotation: {
      x: number;
      y: number;
      z: number;
    };
    position: {
      x: number;
      y: number;
      z: number;
      set(x: number, y: number, z: number): void;
    };
    scale: {
      setScalar(value: number): void;
    };
  };

  type ThreeScene = {
    add(object: unknown): void;
  };

  type ThreeRenderer = {
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: ThreeScene, camera: ThreeCamera): void;
    dispose(): void;
  };

  type ThreeCamera = {
    left: number;
    right: number;
    top: number;
    bottom: number;
    position: {
      x: number;
      y: number;
      z: number;
    };
    updateProjectionMatrix(): void;
  };

  type ThreeRuntime = {
    Scene: new () => ThreeScene;
    WebGLRenderer: new (options: {
      antialias: boolean;
      alpha: boolean;
      powerPreference: string;
    }) => ThreeRenderer;
    OrthographicCamera: new (
      left: number,
      right: number,
      top: number,
      bottom: number,
      near: number,
      far: number,
    ) => ThreeCamera;
    BufferGeometry: new () => ThreeGeometry;
    BufferAttribute: new (
      array: Float32Array,
      itemSize: number,
    ) => ThreeAttribute;
    PointsMaterial: new (options: {
      size: number;
      transparent: boolean;
      opacity: number;
      vertexColors: boolean;
    }) => ThreeMaterial;
    Points: new (geometry: ThreeGeometry, material: ThreeMaterial) => ThreeObject3D;
    MeshBasicMaterial: new (options: {
      color: number;
      wireframe: boolean;
      transparent: boolean;
      opacity: number;
    }) => ThreeMaterial;
    Mesh: new (
      geometry: ThreeGeometry,
      material: ThreeMaterial,
    ) => ThreeObject3D & { material: ThreeMaterial };
    IcosahedronGeometry: new (radius: number, detail: number) => ThreeGeometry;
  };

  const navItems = [
    { href: "#platforms", label: "Platforms" },
    { href: "#signals", label: "Signals" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "/docs", label: "Docs" },
  ];

  const heroWords = [
    "Stop",
    "losing",
    "revenue",
    "you",
    "should",
    "have",
    "kept.",
  ];

  const proofChips = [
    { label: "Works with 4 billing platforms", tone: "success" },
    { label: "Read-only OAuth access", tone: "brand" },
    { label: "AI win-back in seconds", tone: "violet" },
  ];

  const rotatingSignals = [
    {
      customer: "Acme Corp",
      signal: "Card expired · recovery sequence launched",
      amount: "$890 MRR at risk",
      tone: "danger",
    },
    {
      customer: "Loom AI",
      signal: "Disengaged for 18 days · AI follow-up queued",
      amount: "$2,100 MRR protected",
      tone: "warning",
    },
    {
      customer: "Cycle App",
      signal: "High-value cancellation intent · manual escalation",
      amount: "$4,400 expansion saved",
      tone: "brand",
    },
    {
      customer: "Pylon HQ",
      signal: "Downgrade detected · personalized rescue sent",
      amount: "$340 MRR shrinking",
      tone: "info",
    },
    {
      customer: "Linear App",
      signal: "Trial ending in 48h · activation playbook queued",
      amount: "$590 pipeline warming",
      tone: "success",
    },
    {
      customer: "Raycast",
      signal: "Pause risk resolved · account retained",
      amount: "$1,200 recovered",
      tone: "success",
    },
  ];

  const integrationNodes = [
    { label: "Stripe", position: "north" },
    { label: "Paddle", position: "north-east" },
    { label: "Lemon Squeezy", position: "south-east" },
    { label: "Polar", position: "south" },
    { label: "Your Dashboard", position: "south-west" },
  ];

  const signalCards = [
    {
      title: "Card failed",
      description: "Payment friction gets caught before it becomes accidental churn.",
      scenario:
        "Acme Corp — $890/mo — Card expired 2 days ago — Recovery sequence launched automatically.",
    },
    {
      title: "Disengaged",
      description: "Usage decay turns into a churn signal with context and urgency.",
      scenario:
        "Loom AI — $2,100/mo — No sessions in 18 days — Re-engagement email shipped instantly.",
    },
    {
      title: "Downgraded",
      description: "Revenue contraction becomes a save opportunity, not a lagging metric.",
      scenario:
        "Pylon HQ — $340/mo — Plan reduced 44% — Value reinforcement sequence triggered.",
    },
    {
      title: "Cancelled",
      description: "You get the win-back window while context is still fresh.",
      scenario:
        "Cycle App — $4,400/mo — Cancellation intent detected — Executive outreach queued.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Connect a billing platform",
      copy: "OAuth or signed webhook setup takes about a minute. ChurnPulse starts ingesting context immediately.",
    },
    {
      number: "02",
      title: "Signals are classified in real time",
      copy: "Every event becomes a structured churn signal with urgency, MRR impact, and a recommended save motion.",
    },
    {
      number: "03",
      title: "Launch the right recovery motion",
      copy: "Sequences, playbooks, and manual escalation fire before the account becomes a postmortem.",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      monthly: 29,
      blurb: "Core detection and recovery for early-stage teams.",
      features: [
        "Card failed, cancelled, paused, trial risk",
        "1 billing integration",
        "Recovery dashboard",
        "Up to 500 monitored customers",
      ],
    },
    {
      name: "Growth",
      monthly: 49,
      blurb: "The full operating system for keeping revenue.",
      badge: "Best value",
      featured: true,
      features: [
        "All 7 signal types",
        "AI-generated recovery copy",
        "Unlimited monitored customers",
        "Priority alerts + analytics",
      ],
    },
    {
      name: "Scale",
      monthly: 99,
      blurb: "High-MRR save workflows and premium support.",
      features: [
        "Custom domains and exports",
        "Advanced sequence branching",
        "Webhook handoff to internal tools",
        "Dedicated support channel",
      ],
    },
  ];

  let healthStatus = $state<"ok" | "degraded" | "down">("degraded");
  let navScrolled = $state(false);
  let signalFeed = $state(rotatingSignals.slice(0, 5));
  let heroCard = $state<HTMLElement | null>(null);
  let heroCanvas = $state<HTMLDivElement | null>(null);

  onMount(() => {
    const remove: Dispose[] = [];
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateScroll = () => {
      navScrolled = window.scrollY > 100;
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    remove.push(() => window.removeEventListener("scroll", updateScroll));

    const interval = window.setInterval(() => {
      signalFeed = [
        rotatingSignals[Math.floor(Math.random() * rotatingSignals.length)],
        ...signalFeed,
      ].slice(0, 5);
    }, 3000);
    remove.push(() => window.clearInterval(interval));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10%" },
    );

    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    remove.push(() => observer.disconnect());

    const onHeroMove = (event: MouseEvent) => {
      if (!heroCard) {
        return;
      }

      const rect = heroCard.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * 16;
      const ry = (x - 0.5) * 16;

      heroCard.style.setProperty("--rx", `${rx}deg`);
      heroCard.style.setProperty("--ry", `${ry}deg`);
      heroCard.style.setProperty("--mx", `${x * 100}%`);
      heroCard.style.setProperty("--my", `${y * 100}%`);
    };

    const onHeroLeave = () => {
      if (!heroCard) {
        return;
      }

      heroCard.style.setProperty("--rx", "4deg");
      heroCard.style.setProperty("--ry", "-2deg");
      heroCard.style.setProperty("--mx", "50%");
      heroCard.style.setProperty("--my", "50%");
    };

    heroCard?.addEventListener("mousemove", onHeroMove);
    heroCard?.addEventListener("mouseleave", onHeroLeave);
    remove.push(() => {
      heroCard?.removeEventListener("mousemove", onHeroMove);
      heroCard?.removeEventListener("mouseleave", onHeroLeave);
    });

    const loadHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const payload = await response.json();
        healthStatus = payload.status ?? "degraded";
      } catch {
        healthStatus = "down";
      }
    };

    void loadHealth();

    if (!prefersReducedMotion.matches) {
      const cleanupThree = initHeroScene(heroCanvas);
      if (cleanupThree) {
        remove.push(cleanupThree);
      }
    }

    return () => {
      for (const dispose of remove) {
        dispose();
      }
    };
  });

  function initHeroScene(canvasHost: HTMLDivElement | null): Dispose | null {
    const THREE = window.THREE;

    if (!canvasHost || !THREE) {
      return null;
    }

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasHost.appendChild(renderer.domElement);

    let width = canvasHost.clientWidth;
    let height = canvasHost.clientHeight;
    const camera = new THREE.OrthographicCamera(-width / 220, width / 220, height / 220, -height / 220, 0.1, 100);
    camera.position.z = 12;

    const particleCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      const i = index * 3;
      const x = (Math.random() - 0.5) * 18;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 4;
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;
      basePositions[i] = x;
      basePositions[i + 1] = y;
      basePositions[i + 2] = z;

      const mix = index / particleCount;
      colors[i] = 0.32 + mix * 0.28;
      colors[i + 1] = 0.35 + mix * 0.08;
      colors[i + 2] = 0.85 + mix * 0.12;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.055,
        transparent: true,
        opacity: 0.9,
        vertexColors: true,
      }),
    );
    scene.add(points);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x6f6cff,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });

    const sphereA = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 2), wireMaterial);
    sphereA.position.set(4.5, 2.2, -1);
    scene.add(sphereA);

    const sphereBMaterial = wireMaterial.clone();
    sphereBMaterial.opacity = 0.08;
    const sphereB = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 1),
      sphereBMaterial,
    );
    sphereB.position.set(-5.4, -2.4, -1);
    scene.add(sphereB);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvasHost.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        width = canvasHost.clientWidth;
        height = canvasHost.clientHeight;
        camera.left = -width / 220;
        camera.right = width / 220;
        camera.top = height / 220;
        camera.bottom = -height / 220;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      });
    };

    window.addEventListener("resize", onResize);
    onResize();

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = performance.now() * 0.00028;
      const worldX = pointer.x * (width / 220);
      const worldY = pointer.y * (height / 220);

      for (let index = 0; index < particleCount; index += 1) {
        const i = index * 3;
        const bx = basePositions[i];
        const by = basePositions[i + 1];

        let x = bx + Math.sin(time + index * 0.14) * 0.18;
        let y = by + Math.cos(time * 1.2 + index * 0.08) * 0.14;

        const dx = x - worldX;
        const dy = y - worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 1.8) {
          const force = (1.8 - distance) * 0.1;
          x += dx * force;
          y += dy * force;
        }

        positions[i] = x;
        positions[i + 1] = y;
      }

      geometry.attributes.position.needsUpdate = true;
      points.rotation.z += 0.0004;
      camera.position.x = Math.sin(time * 0.35) * 0.22;
      camera.position.y = Math.cos(time * 0.5) * 0.12;
      sphereA.rotation.x += 0.001;
      sphereA.rotation.y += 0.0007;
      sphereA.scale.setScalar(0.9 + Math.sin(time * 1.6) * 0.08);
      sphereB.rotation.x -= 0.0007;
      sphereB.rotation.y += 0.0011;
      sphereB.scale.setScalar(0.88 + Math.cos(time * 1.1) * 0.06);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      wireMaterial.dispose();
      sphereBMaterial.dispose();
      renderer.dispose();
      canvasHost.replaceChildren();
    };
  }
</script>

<svelte:head>
  <title>ChurnPulse | Stop losing revenue you should have kept</title>
  <meta
    name="description"
    content="ChurnPulse catches churn signals across Stripe, Paddle, Lemon Squeezy, and Polar, then launches AI recovery workflows before revenue slips away."
  />
</svelte:head>

<div class="landing-shell">
  <header class="landing-nav" class:landing-nav--scrolled={navScrolled}>
    <a class="landing-nav__logo" href="/" aria-label="ChurnPulse home">
      <span class="app-sidebar__logo-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
      </span>
      <span class="landing-nav__wordmark">Churn<em>Pulse</em></span>
    </a>

    <nav class="landing-nav__links" aria-label="Primary">
      {#each navItems as item, index (item.href)}
        <a class="landing-nav__link landing-nav__link--stagger" style={`animation-delay:${index * 50}ms`} href={item.href}>
          {item.label}
        </a>
      {/each}
      <a class="btn btn-secondary btn-sm" href="/sign-in">Sign in</a>
      <a class="btn btn-primary btn-sm landing-nav__pulse" href="/sign-up">Start free</a>
    </nav>
  </header>

  <main class="landing-main">
    <section class="hero" id="hero">
      <div class="hero__canvas" bind:this={heroCanvas} aria-hidden="true" role="presentation"></div>

      <div class="hero__copy">
        <p class="hero__eyebrow" data-reveal>
          <span class="hero__eyebrow-dot"></span>
          ChurnPulse V2 — now in beta
        </p>

        <h1 class="hero__title">
          {#each heroWords as word, index (word)}
            <span class:hero__title-gradient={word === "revenue"} style={`animation-delay:${index * 80}ms`}>
              {word}
            </span>
          {/each}
        </h1>

        <p class="hero__subtitle" data-reveal>
          Detect churn signals across Stripe, Paddle, Lemon Squeezy, and Polar. Then launch the right save motion before the customer actually leaves.
        </p>

        <div class="hero__actions" data-reveal>
          <a class="btn btn-primary btn-lg hero__cta" href="/sign-up">
            Start free — 60s setup
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
          </a>
          <a class="btn btn-ghost btn-lg hero__ghost" href="/demo">Watch 90s demo</a>
        </div>

        <div class="hero__proof" data-reveal>
          {#each proofChips as chip}
            <div class="hero__proof-chip">
              <span class={`hero__proof-dot hero__proof-dot--${chip.tone}`}></span>
              <span>{chip.label}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="hero__card-wrap">
        <section class="hero-card" bind:this={heroCard}>
          <div class="hero-card__header">
            <div>
              <p class="page-kicker">Live signal feed</p>
              <h3>Recovery center</h3>
            </div>
            <span class="page__header-badge">AI active</span>
          </div>

          <div class="hero-card__metrics">
            <div class="stat-card">
              <p class="stat-card__label">At-risk MRR</p>
              <p class="stat-card__value stat-card__value--danger">$18,930</p>
            </div>
            <div class="stat-card">
              <p class="stat-card__label">Recovery rate</p>
              <p class="stat-card__value stat-card__value--brand">67%</p>
            </div>
          </div>

          <div class="hero-card__feed">
            {#each signalFeed as entry (entry.customer + entry.signal)}
              <article class="hero-card__feed-row">
                <span class={`hero-card__feed-dot hero-card__feed-dot--${entry.tone}`}></span>
                <div>
                  <strong>{entry.customer}</strong>
                  <p>{entry.signal}</p>
                </div>
                <span>{entry.amount}</span>
              </article>
            {/each}
          </div>
        </section>
      </div>
    </section>

    <section class="landing-section" id="platforms" data-reveal>
      <div class="landing-section__header">
        <p class="page-kicker">Platform graph</p>
        <h2>Every billing signal routes through one operating layer</h2>
        <p>OAuth where it exists, signed webhooks where it does not. ChurnPulse normalizes every risk event into one recovery workflow.</p>
      </div>

      <div class="integration-map card">
        <svg viewBox="0 0 800 460" aria-hidden="true">
          <defs>
            <linearGradient id="map-line" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stop-color="oklch(65% 0.2 272 / 0.2)"></stop>
              <stop offset="50%" stop-color="oklch(65% 0.2 272 / 0.85)"></stop>
              <stop offset="100%" stop-color="oklch(80% 0.2 147 / 0.2)"></stop>
            </linearGradient>
          </defs>

          <circle class="integration-map__pulse" cx="400" cy="230" r="52"></circle>
          <circle class="integration-map__center" cx="400" cy="230" r="44"></circle>
          <text x="400" y="236" text-anchor="middle">ChurnPulse</text>

          <path class="integration-map__path" d="M400 230 L210 90"></path>
          <path class="integration-map__path" d="M400 230 L610 110"></path>
          <path class="integration-map__path" d="M400 230 L650 300"></path>
          <path class="integration-map__path" d="M400 230 L390 390"></path>
          <path class="integration-map__path" d="M400 230 L160 300"></path>

          <g class="integration-map__node" transform="translate(160 72)">
            <rect rx="18" width="120" height="56"></rect>
            <text x="60" y="34" text-anchor="middle">Stripe</text>
          </g>
          <g class="integration-map__node" transform="translate(560 82)">
            <rect rx="18" width="120" height="56"></rect>
            <text x="60" y="34" text-anchor="middle">Paddle</text>
          </g>
          <g class="integration-map__node" transform="translate(592 272)">
            <rect rx="18" width="150" height="56"></rect>
            <text x="75" y="34" text-anchor="middle">Lemon Squeezy</text>
          </g>
          <g class="integration-map__node" transform="translate(320 372)">
            <rect rx="18" width="140" height="56"></rect>
            <text x="70" y="34" text-anchor="middle">Polar</text>
          </g>
          <g class="integration-map__node" transform="translate(70 272)">
            <rect rx="18" width="180" height="56"></rect>
            <text x="90" y="34" text-anchor="middle">Your Dashboard</text>
          </g>
        </svg>
      </div>
    </section>

    <section class="landing-section" id="signals">
      <div class="landing-section__header" data-reveal>
        <p class="page-kicker">Signal intelligence</p>
        <h2>Each churn signal carries context, urgency, and a save motion</h2>
      </div>

      <div class="signal-flip-grid">
        {#each signalCards as card, index (card.title)}
          <article class="signal-flip-card" data-reveal style={`transition-delay:${index * 120}ms`}>
            <div class="signal-flip-card__inner">
              <div class="signal-flip-card__face signal-flip-card__face--front">
                <p class="page-kicker">Signal type</p>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
              <div class="signal-flip-card__face signal-flip-card__face--back">
                <p class="page-kicker">Example</p>
                <p>{card.scenario}</p>
              </div>
            </div>
          </article>
        {/each}
      </div>
    </section>

    <section class="landing-section" id="how-it-works">
      <div class="landing-section__header" data-reveal>
        <p class="page-kicker">How it works</p>
        <h2>One timeline from billing event to recovery motion</h2>
      </div>

      <div class="timeline" data-reveal>
        <span class="timeline__rail" aria-hidden="true"></span>
        {#each steps as step}
          <article class="timeline__step card">
            <span class="timeline__watermark">{step.number}</span>
            <span class="timeline__node">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.copy}</p>
          </article>
        {/each}
      </div>
    </section>

    <section class="landing-section" id="pricing">
      <div class="landing-section__header" data-reveal>
        <p class="page-kicker">Pricing</p>
        <h2>Pricing that pays for itself the first time a customer is saved</h2>
      </div>

      <div class="pricing-grid">
        {#each pricingPlans as plan}
          <article class="pricing-card" class:pricing-card--featured={plan.featured} data-reveal>
            {#if plan.badge}
              <span class="pricing-card__badge">{plan.badge}</span>
            {/if}
            <div class="pricing-card__head">
              <h3>{plan.name}</h3>
              <p>{plan.blurb}</p>
            </div>
            <p class="pricing-card__price">
              <strong>${plan.monthly}</strong>
              <span>/ month</span>
            </p>
            <ul class="pricing-card__features">
              {#each plan.features as feature}
                <li>{feature}</li>
              {/each}
            </ul>
            <a class={`btn ${plan.featured ? "btn-primary" : "btn-secondary"} btn-full`} href="/sign-up">
              {plan.featured ? "Start free" : "Choose plan"}
            </a>
          </article>
        {/each}
      </div>
    </section>
  </main>

  <footer class="footer landing-footer">
    <div class="footer__intro">
      <div class="landing-nav__logo">
        <span class="app-sidebar__logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        </span>
        <span class="landing-nav__wordmark">Churn<em>Pulse</em></span>
      </div>
      <p>AI-powered churn prevention for SaaS teams that care about recovered revenue, not vanity dashboards.</p>
      <p class="landing-footer__health">
        <span class={`landing-footer__health-dot landing-footer__health-dot--${healthStatus}`}></span>
        All systems {healthStatus === "ok" ? "operational" : healthStatus}
      </p>
    </div>

    <div class="footer__links">
      <a class="footer__link" href="/docs">Docs</a>
      <a class="footer__link" href="/pricing">Pricing</a>
      <a class="footer__link" href="/demo">Demo</a>
      <a class="footer__link" href="/changelog">Changelog</a>
      <a class="footer__link" href="/privacy">Privacy</a>
      <a class="footer__link" href="/terms-and-conditions">Terms</a>
    </div>
  </footer>
</div>
