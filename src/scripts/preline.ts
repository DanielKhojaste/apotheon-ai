import HSCollapse from "preline/plugins/collapse-non-auto";

function initPreline() {
  HSCollapse.autoInit();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPreline);
} else {
  initPreline();
}

document.addEventListener("astro:page-load", initPreline);
