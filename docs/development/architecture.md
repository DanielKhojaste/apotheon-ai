# Architecture

## Repository Structure

```text
dist/
docs/
public/
screenshots/
src/
studio/
tests/
```

The two main source areas are:

- `src/` for the Astro application
- `studio/` for Sanity Studio and CMS schemas

## Astro Application

`src/` contains the pages, layouts, components, browser scripts, and styles used by the site.

Astro handles the main rendering layer.

## Components

Reusable UI is kept in Astro components.

Examples include:

- Header
- BlogCard
- About page skill accordions
- shared page sections
- navigation
- layout elements

Props are used to pass page or CMS data into components.

## Browser-Side TypeScript

Interactive behavior that does not need React can stay in TypeScript.

The header is one example:

```text
Header.astro
    -> markup
    -> accessible menu button
    -> Preline overlay trigger and navigation

header.ts
    -> scroll behavior
    -> overlay state coordination
    -> GSAP hamburger-to-X animation
```

This keeps the markup separate from browser behavior without adding a framework component only for event handling.

## Astro and React

Astro is the default choice for the site.

React is only necessary when a component needs the kind of client-side state or component behavior that benefits from React.

For small interactions, an Astro component plus TypeScript is usually enough.

## Styling

Tailwind CSS is used for layout and component styling.

Shared project styles and reusable utilities live in the global stylesheet.

The active fonts are:

- CaneNero
- Playfair Display
- Inter

Shared utilities are useful when the same behavior appears across multiple components.

For example, the project uses a `noselect` utility for images that should not be selectable.

## GSAP

GSAP is used for the custom hamburger-to-X animation in the site header.

The menu icon is built from SVG geometry and animated with GSAP so the transition can be controlled more precisely than a simple icon swap. The same menu button stays above the navigation overlay while it transitions between the hamburger and X states.

This keeps the interaction visually continuous and prevents the icon from blinking or being replaced when the overlay opens. The animation remains custom even though Preline manages the overlay behavior around it.

## Preline UI

Preline UI is used selectively for interactive behavior in two parts of the site:

- the header navigation overlay
- the skills accordions on the About page

For the header, Preline manages the core overlay open and close behavior and overlay state. Custom TypeScript coordinates the surrounding header behavior, while GSAP handles the hamburger-to-X animation.

On the About page, Preline accordion behavior is used to organize the skills content into expandable sections without requiring a custom accordion implementation.

Most of the site does not need component-library behavior, so components such as BlogCard remain custom Astro and Tailwind components instead of being rewritten around Preline without a clear benefit.

This keeps Preline focused on interactions where it saves useful implementation work while the project's layout, styling, and reusable components remain custom.

## Sanity

Sanity Studio lives in `studio/`.

The frontend does not read directly from the Studio UI. It queries the Sanity dataset.

The blog data flow is:

```text
Sanity
    |
    v
GROQ
    |
    v
Astro page
    |
    v
Astro component
```

The schema, GROQ query, TypeScript type, and component props must agree on the fields being used.

## Blog Listing

The blog listing fetches only the fields required by the cards.

Typical fields include:

- title
- slug
- excerpt
- publication date
- author name
- header image URL
- header image alternative text

The full article content can be fetched separately by the dynamic article page.

## Testing

End-to-end testing is handled with Playwright.

The test suite covers high-value user flows across the main pages, shared navigation, content, links, image loading, and important client-side behavior. The Playwright configuration builds the production Astro site and runs tests against Astro Preview so the tested output is close to the deployed application.

See [Playwright Tests](../testing/playwright-tests.md) for the testing workflow and CI details.

## Accessibility

Interactive components should preserve:

- semantic HTML
- keyboard access
- visible focus states
- correct ARIA state
- meaningful image alternative text
- reduced-motion support where animation is used

Accessibility behavior should stay attached to the same control that owns the interaction. For example, the header should not create a second close button only for visual convenience if the existing menu button can remain the active control.
