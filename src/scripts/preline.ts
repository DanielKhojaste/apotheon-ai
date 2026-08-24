import { HSAccordion, HSOverlay } from "preline/non-auto";

function initPreline() {
	HSOverlay.autoInit();
	HSAccordion.autoInit();
}

function closeNavOnOutsideClick(event: MouseEvent) {
	const overlay = document.getElementById("hs-header-overlay-nav");

	if (!overlay?.classList.contains("open")) {
		return;
	}

	const target = event.target;

	if (!(target instanceof Element)) {
		return;
	}

	if (target.closest("button, a")) {
		return;
	}

	HSOverlay.close(overlay);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initPreline);
} else {
	initPreline();
}

document.addEventListener("astro:page-load", initPreline);
document.addEventListener("click", closeNavOnOutsideClick);
