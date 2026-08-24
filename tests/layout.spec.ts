import { expect, test } from "@playwright/test";

test.describe("Shared site layout", () => {
	test("navigation menu opens and navigates to another page", async ({
		page,
	}) => {
		await page.goto("/");

		const toggle = page.getByRole("button", {
			name: "Open navigation",
		});

		await expect(toggle).toBeVisible();
		await expect(toggle).toHaveAttribute("aria-expanded", "false");

		await toggle.click();

		await expect(toggle).toHaveAttribute("aria-expanded", "true");
		await expect(toggle).toHaveAttribute("aria-label", "Close navigation");

		const navigation = page.getByRole("dialog", {
			name: "Site navigation",
		});

		await expect(navigation).toBeVisible();

		for (const link of ["Platform", "About", "Blog", "Contact"]) {
			await expect(navigation.getByRole("link", { name: link })).toBeVisible();
		}

		await navigation.getByRole("link", { name: "About" }).click();

		await expect(page).toHaveURL(/\/about\/?$/);
		await expect(page).toHaveTitle("About | ApotheonAI");
	});

	test("site logo returns to the homepage", async ({ page }) => {
		await page.goto("/about");

		const homeLink = page.getByRole("link", {
			name: "ApotheonAI home",
		});

		await expect(homeLink).toHaveAttribute("href", "/");

		await homeLink.click();

		await expect(page).toHaveURL(/\/$/);
		await expect(page).toHaveTitle("ApotheonAI | Ascend to the divine");
	});

	test("footer contains working navigation and contact destinations", async ({
		page,
	}) => {
		await page.goto("/");

		const footer = page.locator("footer");

		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeVisible();

		const footerNav = footer.getByRole("navigation", {
			name: "Footer navigation",
		});

		const expectedLinks = [
			["Platform", "/platform"],
			["About", "/about"],
			["Blog", "/blog"],
			["Contact", "/contact"],
		] as const;

		for (const [name, href] of expectedLinks) {
			await expect(footerNav.getByRole("link", { name })).toHaveAttribute(
				"href",
				href,
			);
		}

		await expect(footer.getByRole("link", { name: "Email" })).toHaveAttribute(
			"href",
			"mailto:danielkhojaste101@gmail.com",
		);

		const linkedin = footer.getByRole("link", {
			name: "LinkedIn",
		});

		await expect(linkedin).toHaveAttribute(
			"href",
			"https://www.linkedin.com/in/aref-khojaste/",
		);
		await expect(linkedin).toHaveAttribute("target", "_blank");
		await expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");

		const github = footer.getByRole("link", {
			name: "GitHub",
		});

		await expect(github).toHaveAttribute(
			"href",
			"https://github.com/DanielKhojaste",
		);
		await expect(github).toHaveAttribute("target", "_blank");
	});

	test("footer brand asset loads successfully", async ({ page }) => {
		await page.goto("/");

		const logo = page.locator('footer img[src="/brand/apotheonai-logo.svg"]');

		await logo.scrollIntoViewIfNeeded();

		await expect
			.poll(async () => {
				return logo.evaluate(
					(image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
				);
			})
			.toBe(true);
	});
});

test.describe("Homepage hero", () => {
	test("renders the primary hero content and image", async ({ page }) => {
		await page.goto("/");

		const heading = page.locator("#hero-heading");

		await expect(heading).toBeVisible();
		await expect(heading).toContainText("ASCEND");
		await expect(heading).toContainText("TO THE");
		await expect(heading).toContainText("DIVINE");

		const helmet = page.getByAltText("Weathered bronze Spartan helmet");

		await expect(helmet).toBeVisible();

		await expect
			.poll(async () => {
				return helmet.evaluate(
					(image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
				);
			})
			.toBe(true);
	});
});

test.describe("Runtime health", () => {
	const routes = ["/", "/about", "/platform", "/contact", "/blog"];

	for (const route of routes) {
		test(`${route} has no uncaught client-side errors`, async ({ page }) => {
			const errors: string[] = [];

			page.on("pageerror", (error) => {
				errors.push(error.message);
			});

			await page.goto(route);
			await page.waitForLoadState("load");

			expect(errors).toEqual([]);
		});
	}
});
