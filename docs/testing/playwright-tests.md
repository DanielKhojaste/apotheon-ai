# Testing

ApotheonAI uses [Playwright](https://playwright.dev/) for end-to-end testing.

## Approach

I was already familiar with Playwright before this project, but working through the testing setup helped me become more comfortable with its configuration, locators, assertions, browser automation, and CI workflow.

Most of the test code and supporting configuration were written with AI assistance. I used AI primarily to generate the Playwright tests, refine the configuration, diagnose failures, and suggest fixes. I reviewed the generated code, ran the tests locally, inspected failures, and adjusted the implementation where necessary.

I also found some bugs and design issues manually while using the site. When I noticed something that looked or behaved incorrectly, I used AI to help investigate the cause, implement a fix, and, when appropriate, add or improve Playwright coverage so the same issue would be easier to catch again.

This made the testing process a practical exercise in both Playwright and AI-assisted development rather than an attempt to write every test manually.

## What is tested

The suite covers the main user-facing parts of the site, including:

- Core page availability and successful route loading
- Homepage content and calls to action
- About page content
- Platform page content and navigation
- Contact links and external destinations
- Blog listing and article navigation
- Shared navigation behavior
- Footer links and brand assets
- Hero content and image loading
- Client-side runtime errors on important routes

The tests are intentionally focused on high-value end-to-end behavior instead of trying to test every visual detail.

## Project structure

Playwright tests live in the root-level `tests/` directory.

```text
tests/
├── smoke.spec.ts
├── pages.spec.ts
└── layout.spec.ts
```

The main Playwright configuration is stored in:

```text
playwright.config.ts
```

## Local configuration

The test suite currently runs against Chromium.

Playwright starts the production version of the Astro site automatically before running the tests. The configured web server builds the application first and then launches Astro Preview.

```ts
webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
},
```

The shared base URL is:

```ts
use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
},
```

Using the production build for end-to-end tests gives better confidence that the version being tested is close to what will actually be deployed.

## Running the tests

Install dependencies:

```bash
npm ci
```

Install Chromium for Playwright if necessary:

```bash
npx playwright install chromium
```

Run the full test suite:

```bash
npx playwright test
```

Open the HTML report:

```bash
npx playwright show-report
```

## CI with GitHub Actions

The repository includes a GitHub Actions workflow for Playwright.

The workflow:

- Checks out the repository
- Installs Node.js dependencies
- Installs Playwright Chromium and its required system dependencies
- Builds the Astro site
- Runs the end-to-end test suite
- Uploads the Playwright HTML report as an artifact

The workflow also receives the public Sanity configuration through GitHub repository variables:

```text
PUBLIC_SANITY_PROJECT_ID
PUBLIC_SANITY_DATASET
```

These values are required because the Astro production build fetches Sanity content.

The Playwright workflow is scheduled to run once per month and can also be triggered manually from GitHub Actions. It is not configured to run on every push.

## Debugging notes

One useful failure during development involved the navigation toggle.

The test initially located the button using its accessible name:

```ts
page.getByRole("button", { name: "Open navigation" })
```

After the menu opened, the button correctly changed its accessible name to `Close navigation`. Because Playwright locators are evaluated against the current page state, the original locator no longer matched the element.

The fix was to locate the updated button after the click:

```ts
const closeToggle = page.getByRole("button", {
    name: "Close navigation",
});

await expect(closeToggle).toHaveAttribute("aria-expanded", "true");
```

This was a useful example of why accessible roles and names are valuable in end-to-end tests. The failure was caused by the test assumption, not by the navigation implementation.

## AI-assisted testing

AI was used mainly to speed up test writing, troubleshoot failures, refine selectors and assertions, and help configure Playwright and GitHub Actions.

I already had some familiarity with Playwright, and this project gave me more practical experience using it in a real project. I ran and reviewed the tests myself, checked reports, reproduced failures, and verified fixes in the browser.

I also found bugs and design issues manually while using the site. When that happened, I used AI to help investigate the cause, fix the issue, and add a regression test when it made sense.

Overall, the process helped me become more comfortable with Playwright while also giving me experience using AI as a practical development and testing assistant.
