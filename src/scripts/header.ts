const HEADER_SELECTOR = "[data-site-header]";
const HERO_SELECTOR = ".hero-section";
const OVERLAY_ID = "hs-header-overlay-nav";
const VISIBLE_CLASS = "is-visible";
const SOLID_CLASS = "is-solid";
const DIRECTION_THRESHOLD = 8;

let lastScrollY = 0;
let heroInView = false;
let ticking = false;
let scrollBound = false;
let heroObserver: IntersectionObserver | null = null;

function getHeader(): HTMLElement | null {
	return document.querySelector<HTMLElement>(HEADER_SELECTOR);
}

function isOverlayOpen(): boolean {
	return document.getElementById(OVERLAY_ID)?.classList.contains("open") === true;
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
	setHeaderState(true, !heroInView);

	if (!scrollBound) {
		window.addEventListener("scroll", onScroll, { passive: true });
		scrollBound = true;
	}
}

initHeader();
document.addEventListener("astro:page-load", initHeader);
