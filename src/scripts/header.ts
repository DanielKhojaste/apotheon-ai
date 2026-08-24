const HEADER_SELECTOR = "[data-site-header]";
const HERO_SELECTOR = ".hero-section";
const OVERLAY_ID = "hs-header-overlay-nav";
const TOGGLE_ID = "hs-header-overlay";
const VISIBLE_CLASS = "is-visible";
const SOLID_CLASS = "is-solid";
const MENU_OPEN_CLASS = "is-menu-open";
const DIRECTION_THRESHOLD = 8;

let lastScrollY = 0;
let heroInView = false;
let ticking = false;
let scrollBound = false;
let heroObserver: IntersectionObserver | null = null;
let overlayObserver: MutationObserver | null = null;

function getHeader(): HTMLElement | null {
	return document.querySelector<HTMLElement>(HEADER_SELECTOR);
}

function getOverlay(): HTMLElement | null {
	return document.getElementById(OVERLAY_ID);
}

function getToggle(): HTMLButtonElement | null {
	return document.getElementById(TOGGLE_ID) as HTMLButtonElement | null;
}

function isOverlayOpen(): boolean {
	return getOverlay()?.classList.contains("open") === true;
}

function syncMenuToggle() {
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
}

function observeOverlay() {
	overlayObserver?.disconnect();
	overlayObserver = null;

	const overlay = getOverlay();

	if (!overlay) {
		return;
	}

	syncMenuToggle();

	overlayObserver = new MutationObserver(() => {
		syncMenuToggle();

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
