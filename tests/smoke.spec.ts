import { expect, test } from "@playwright/test";

const routes = ["/", "/about", "/platform", "/contact", "/blog"];

for (const route of routes) {
	test(`${route} loads successfully`, async ({ page }) => {
		const response = await page.goto(route);

		expect(response?.ok()).toBeTruthy();
		await expect(page.locator("body")).toBeVisible();
	});
}
