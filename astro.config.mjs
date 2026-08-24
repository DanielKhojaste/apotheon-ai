// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

import react from "@astrojs/react";
import sanity from "@sanity/astro";
import tailwindcss from "@tailwindcss/vite";

import icon from "astro-icon";

// astro.config.mjs runs before Astro auto-loads .env files, so load them explicitly from the current project directory. Written with the help of ChatGPT.
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
    process.env.NODE_ENV ?? "development",
    process.cwd(),
    "",
);

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
    },

    integrations: [react(), sanity({
        projectId: PUBLIC_SANITY_PROJECT_ID,
        dataset: PUBLIC_SANITY_DATASET,
        apiVersion: "2026-08-23",
        useCdn: false,
		}), icon()],
});