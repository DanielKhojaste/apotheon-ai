# Architecture

## Repository Structure

```text
dist/
docs/
node_modules/
public/
screenshots/
src/
studio/
to-do/
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
    -> overlay navigation

header.ts
    -> scroll behavior
    -> overlay state
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

## Header Animation

The menu icon uses SVG geometry animated with GSAP.

The same menu button stays above the navigation overlay while it transitions between the hamburger and X states.

This avoids swapping between two different controls and prevents the icon from blinking when the overlay opens.

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

## Accessibility

Interactive components should preserve:

- semantic HTML
- keyboard access
- visible focus states
- correct ARIA state
- meaningful image alternative text
- reduced-motion support where animation is used

Accessibility behavior should stay attached to the same control that owns the interaction. For example, the header should not create a second close button only for visual convenience if the existing menu button can remain the active control.
