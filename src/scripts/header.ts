import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(MorphSVGPlugin);

const HEADER_SELECTOR = "[data-site-header]";
const HERO_SELECTOR = ".hero-section";
const OVERLAY_ID = "hs-header-overlay-nav";
const TOGGLE_ID = "hs-header-overlay";
const VISIBLE_CLASS = "is-visible";
const SOLID_CLASS = "is-solid";
const MENU_OPEN_CLASS = "is-menu-open";
const MENU_TRANSITION_CLASS = "is-menu-transitioning";
const DIRECTION_THRESHOLD = 8;

const CLOSED_TOP = "M 0 20 L 100 20";
const CLOSED_MIDDLE = "M 25 50 L 100 50";
const CLOSED_BOTTOM = "M 0 80 L 100 80";

// The top and middle paths meet exactly here before becoming one diagonal.
const MERGED_DIAGONAL = "M 5 32 L 95 40";
const MERGED_BOTTOM = "M 5 68 L 95 60";

const OPEN_BACKSLASH = "M 15 15 L 85 85";
const OPEN_SLASH = "M 15 85 L 85 15";

let lastScrollY = 0;
let heroInView = false;
let ticking = false;
let scrollBound = false;
let heroObserver: IntersectionObserver | null = null;
let overlayObserver: MutationObserver | null = null;
let menuTimeline: gsap.core.Timeline | null = null;
let lastMenuOpen: boolean | null = null;
const boundToggles = new WeakSet<HTMLButtonElement>();

function getHeader(): HTMLElement | null {
	return document.querySelector<HTMLElement>(HEADER_SELECTOR);
}

function getOverlay(): HTMLElement | null {
	return document.getElementById(OVERLAY_ID);
}

function getToggle(): HTMLButtonElement | null {
	return document.getElementById(TOGGLE_ID) as HTMLButtonElement | null;
}

type MenuPaths = {
	top: SVGPathElement;
	middle: SVGPathElement;
	bottom: SVGPathElement;
};

function getMenuPaths(): MenuPaths | null {
	const toggle = getToggle();

	if (!toggle) {
		return null;
	}

	const top = toggle.querySelector<SVGPathElement>('[data-nav-line="top"]');
	const middle = toggle.querySelector<SVGPathElement>(
		'[data-nav-line="middle"]',
	);
	const bottom = toggle.querySelector<SVGPathElement>(
		'[data-nav-line="bottom"]',
	);

	if (!top || !middle || !bottom) {
		return null;
	}

	return { top, middle, bottom };
}

function isOverlayOpen(): boolean {
	return getOverlay()?.classList.contains("open") === true;
}

function finishMenuTransition() {
	getHeader()?.classList.remove(MENU_TRANSITION_CLASS);
}

function buildMenuTimeline(): gsap.core.Timeline | null {
	menuTimeline?.kill();
	menuTimeline = null;

	const paths = getMenuPaths();

	if (!paths) {
		return null;
	}

	const { top, middle, bottom } = paths;

	// Rebuild from a known closed geometry. The current overlay state is applied
	// immediately after this timeline is created.
	gsap.set(top, { attr: { d: CLOSED_TOP }, visibility: "visible" });
	gsap.set(middle, { attr: { d: CLOSED_MIDDLE }, visibility: "visible" });
	gsap.set(bottom, { attr: { d: CLOSED_BOTTOM }, visibility: "visible" });

	menuTimeline = gsap.timeline({
		paused: true,
		onComplete: finishMenuTransition,
		onReverseComplete: finishMenuTransition,
	});

	// Phase 1: the middle bar does not vanish. It lengthens and meets the top
	// bar at exactly the same path while the bottom begins tilting upward.
	menuTimeline
		.to(
			top,
			{
				morphSVG: { shape: MERGED_DIAGONAL, type: "linear" },
				duration: 0.18,
				ease: "power2.in",
			},
			0,
		)
		.to(
			middle,
			{
				morphSVG: { shape: MERGED_DIAGONAL, type: "linear" },
				duration: 0.18,
				ease: "power2.in",
			},
			0,
		)
		.to(
			bottom,
			{
				morphSVG: { shape: MERGED_BOTTOM, type: "linear" },
				duration: 0.18,
				ease: "power2.in",
			},
			0,
		);

	// Phase 2: the now-identical top + middle paths travel together as one
	// diagonal. The bottom becomes the opposing diagonal.
	menuTimeline
		.to(
			top,
			{
				morphSVG: { shape: OPEN_BACKSLASH, type: "linear" },
				duration: 0.28,
				ease: "power2.out",
			},
			0.18,
		)
		.to(
			middle,
			{
				morphSVG: { shape: OPEN_BACKSLASH, type: "linear" },
				duration: 0.28,
				ease: "power2.out",
			},
			0.18,
		)
		.to(
			bottom,
			{
				morphSVG: { shape: OPEN_SLASH, type: "linear" },
				duration: 0.28,
				ease: "power2.out",
			},
			0.18,
		)
		// Once the middle is perfectly coincident with the top path, remove the
		// duplicate paint. Reversing the timeline restores it before separation.
		.set(middle, { visibility: "hidden" });

	return menuTimeline;
}

function setMenuIconState(open: boolean, animate = true) {
	const timeline = menuTimeline ?? buildMenuTimeline();

	if (!timeline) {
		return;
	}

	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	if (!animate || reduceMotion) {
		timeline.pause(open ? timeline.duration() : 0);
		finishMenuTransition();
		return;
	}

	getHeader()?.classList.add(MENU_TRANSITION_CLASS);

	if (open) {
		timeline.play();
	} else {
		timeline.reverse();
	}
}

function syncMenuToggle(animate = true) {
	const toggle = getToggle();

	if (!toggle) {
		return;
	}

	const open = isOverlayOpen();
	toggle.setAttribute("aria-expanded", String(open));
	toggle.setAttribute(
		"aria-label",
		open ? "Close navigation" : "Open navigation",
	);
	getHeader()?.classList.toggle(MENU_OPEN_CLASS, open);

	if (lastMenuOpen === null) {
		setMenuIconState(open, false);
	} else if (open !== lastMenuOpen) {
		setMenuIconState(open, animate);
	}

	lastMenuOpen = open;
}

function previewMenuToggle() {
	const toggle = getToggle();

	if (!toggle) {
		return;
	}

	// Run before Preline's normal click handler so the icon starts morphing
	// while the current frame is still visible. This prevents the overlay from
	// painting over the hamburger for a frame before our observer catches up.
	const opening = !isOverlayOpen();

	// Keep the header visible and start the morph, but leave Preline-owned
	// overlay/ARIA state untouched until Preline performs the actual toggle.
	setHeaderState(true, !heroInView);
	setMenuIconState(opening, true);
}

function bindTogglePreview() {
	const toggle = getToggle();

	if (!toggle || boundToggles.has(toggle)) {
		return;
	}

	// Capture runs before Preline's target/bubble click listener. There is no
	// paint between these handlers, so the same icon remains continuously
	// visible as the overlay opens.
	toggle.addEventListener("click", previewMenuToggle, { capture: true });
	boundToggles.add(toggle);
}

function observeOverlay() {
	overlayObserver?.disconnect();
	overlayObserver = null;
	menuTimeline?.kill();
	menuTimeline = null;
	lastMenuOpen = null;

	const overlay = getOverlay();

	if (!overlay) {
		return;
	}

	buildMenuTimeline();
	syncMenuToggle(false);
	bindTogglePreview();

	overlayObserver = new MutationObserver(() => {
		syncMenuToggle(true);

		if (isOverlayOpen()) {
			setHeaderState(true, !heroInView);
		}
	});

	overlayObserver.observe(overlay, {
		attributes: true,
		attributeFilter: ["class"],
	});
}

function setHeaderState(visible: boolean, solid: boolean) {
	const header = getHeader();

	if (!header) {
		return;
	}

	header.classList.toggle(VISIBLE_CLASS, visible);
	header.classList.toggle(SOLID_CLASS, solid);
	header.querySelector("nav")?.toggleAttribute("inert", !visible);
}

function syncFromScroll() {
	const currentY = window.scrollY;
	const delta = currentY - lastScrollY;

	if (isOverlayOpen()) {
		setHeaderState(true, !heroInView);
		lastScrollY = currentY;
		return;
	}

	if (heroInView) {
		setHeaderState(true, false);
		lastScrollY = currentY;
		return;
	}

	if (Math.abs(delta) < DIRECTION_THRESHOLD) {
		return;
	}

	setHeaderState(delta < 0, true);
	lastScrollY = currentY;
}

function onScroll() {
	if (ticking) {
		return;
	}

	ticking = true;
	requestAnimationFrame(() => {
		ticking = false;
		syncFromScroll();
	});
}

function observeHero() {
	heroObserver?.disconnect();
	heroObserver = null;

	const hero = document.querySelector(HERO_SELECTOR);

	if (!hero) {
		heroInView = false;
		return;
	}

	const rect = hero.getBoundingClientRect();
	heroInView = rect.bottom > 0 && rect.top < window.innerHeight;

	heroObserver = new IntersectionObserver(
		(entries) => {
			heroInView = entries.some((entry) => entry.isIntersecting);

			if (heroInView && !isOverlayOpen()) {
				setHeaderState(true, false);
			}
		},
		{ threshold: 0 },
	);

	heroObserver.observe(hero);
}

function initHeader() {
	lastScrollY = window.scrollY;
	observeHero();
	observeOverlay();
	setHeaderState(true, !heroInView);

	if (!scrollBound) {
		window.addEventListener("scroll", onScroll, { passive: true });
		scrollBound = true;
	}
}

initHeader();
document.addEventListener("astro:page-load", initHeader);
