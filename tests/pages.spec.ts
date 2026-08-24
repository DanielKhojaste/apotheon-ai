import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
	test("shows core content and platform links", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveTitle("ApotheonAI | Ascend to the divine");

		const manifesto = page.locator("#manifesto-title");
		await expect(manifesto).toBeVisible();
		await expect(manifesto).toContainText("AI is moving");
		await expect(manifesto).toContainText("governance.");

		await expect(
			page.getByRole("heading", {
				name: "Elevate the standard of AI security.",
			}),
		).toBeVisible();

		const platformLinks = page.getByRole("link", {
			name: "Explore the Platform",
		});

		await expect(platformLinks.first()).toHaveAttribute("href", "/platform");

		await expect(
			page.getByRole("link", { name: "Talk to Us" }),
		).toHaveAttribute("href", "/contact");
	});

	test("assessment CTA jumps to assessment questions", async ({ page }) => {
		await page.goto("/");

		const assessment = page.locator("#assessment-questions");
		await expect(assessment).toBeAttached();

		await page.getByRole("link", { name: "Begin Assessment" }).click();

		await expect(page).toHaveURL(/#assessment-questions$/);
	});
});

test.describe("About page", () => {
	test("shows project information and technology stack", async ({ page }) => {
		await page.goto("/about");

		await expect(page).toHaveTitle("About | ApotheonAI");

		await expect(
			page.getByRole("heading", {
				name: /A fictional company.*A real development project/,
			}),
		).toBeVisible();

		await expect(
			page.getByText(
				"ApotheonAI is not a real cybersecurity company or security product.",
				{ exact: false },
			),
		).toBeVisible();

		for (const technology of [
			"Astro",
			"TypeScript",
			"Tailwind CSS",
			"Sanity",
			"React",
			"Playwright",
			"GitHub",
		]) {
			await expect(
				page.getByText(technology, { exact: true }).first(),
			).toBeVisible();
		}

		await expect(
			page.getByRole("link", { name: /Explore the platform/i }).first(),
		).toHaveAttribute("href", "/platform");

		await expect(
			page.getByRole("link", { name: /Read the blog/i }),
		).toHaveAttribute("href", "/blog");
	});
});

test.describe("Platform page", () => {
	test("shows capabilities and primary navigation", async ({ page }) => {
		await page.goto("/platform");

		await expect(page).toHaveTitle("Platform | ApotheonAI");

		await expect(
			page.getByRole("heading", {
				name: "Security for the full AI lifecycle.",
			}),
		).toBeVisible();

		await expect(page.locator("#capabilities")).toBeAttached();

		await page.getByRole("link", { name: "Explore Capabilities" }).click();
		await expect(page).toHaveURL(/#capabilities$/);

		await expect(
			page.getByRole("heading", {
				name: "Build AI on a stronger foundation.",
			}),
		).toBeVisible();

		await expect(
			page.getByRole("link", { name: "Read the Blog" }),
		).toHaveAttribute("href", "/blog");

		await expect(
			page.getByRole("link", { name: "Talk to Us" }),
		).toHaveAttribute("href", "/contact");
	});
});

test.describe("Contact page", () => {
	test("shows correct contact destinations", async ({ page }) => {
		await page.goto("/contact");

		await expect(page).toHaveTitle("Contact | ApotheonAI");

		await expect(
			page.getByRole("heading", { name: "Daniel Khojaste" }),
		).toBeVisible();

		const contactNav = page.getByRole("navigation", {
			name: "Contact links",
		});

		await expect(
			contactNav.locator('a[href="mailto:danielkhojaste101@gmail.com"]'),
		).toBeVisible();

		const linkedIn = contactNav.locator(
			'a[href="https://www.linkedin.com/in/aref-khojaste/"]',
		);

		await expect(linkedIn).toBeVisible();
		await expect(linkedIn).toHaveAttribute("target", "_blank");
		await expect(linkedIn).toHaveAttribute("rel", "noopener noreferrer");

		const github = contactNav.locator(
			'a[href="https://github.com/DanielKhojaste"]',
		);

		await expect(github).toBeVisible();
		await expect(github).toHaveAttribute("target", "_blank");
	});
});

test.describe("Blog", () => {
	test("opens an article and can navigate back to the blog", async ({
		page,
	}) => {
		await page.goto("/blog");

		await expect(page).toHaveTitle("Blog | ApotheonAI");

		await expect(
			page.getByRole("heading", {
				name: /Ideas, notes.*and things I’m learning/,
			}),
		).toBeVisible();

		const articleLink = page.locator('main a[href^="/blog/"]').first();

		await expect(articleLink).toBeVisible();

		const href = await articleLink.getAttribute("href");

		expect(href).toBeTruthy();
		expect(href).toMatch(/^\/blog\/[^/]+\/?$/);

		await page.goto(href!);

		await expect(page.locator("h1")).toBeVisible();
		await expect(page.locator(".article-content")).toBeVisible();

		await expect(
			page.getByRole("link", { name: "Back to blog" }),
		).toHaveAttribute("href", "/blog");

		await expect(
			page.getByRole("link", { name: "All articles" }),
		).toHaveAttribute("href", "/blog");
	});
});
