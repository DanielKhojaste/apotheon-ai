# Local Setup

## Requirements

Install:

- Node.js
- npm
- Git

Use versions compatible with the dependencies in `package.json`.

## Install Dependencies

From the project root:

```bash
npm install
```

## Run the Astro Site

```bash
npm run dev
```

Open the local URL printed by Astro.

## Build the Site

```bash
npm run build
```

The generated output is written to:

```text
dist/
```

Run the build before committing changes that affect components, pages, TypeScript, or CMS integration.

## Sanity Studio

The Studio project lives in:

```text
studio/
```

Use the scripts defined in the Studio package configuration to run it locally.

The Studio must point to the same Sanity project and dataset that the Astro frontend expects.

Do not commit private tokens or secret environment values.

## Main Folders

```text
public/       Static public assets
screenshots/  Screenshots used by the repository or project
src/          Astro application source
studio/       Sanity Studio and CMS schemas
tests/        Playwright end-to-end tests
dist/         Generated Astro build output
```

## Before Committing

Check the change itself rather than committing temporary development helpers.

Before committing:

- review the diff
- remove temporary `console.log` statements
- remove duplicated posts or other layout-preview data
- check the affected page at relevant screen sizes
- run `npm run build`
- run the relevant Playwright tests for changes that affect user-facing behavior
- confirm CMS fields still flow through the query, type, and component correctly when applicable
