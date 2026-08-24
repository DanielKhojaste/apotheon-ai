# Blog Authoring Guide

This guide is for anyone adding or editing blog posts through Sanity Studio.

Normal blog publishing should not require changes to the Astro frontend.

## Open Sanity Studio

Open the Studio for the ApotheonAI project.

The blog currently uses two document types:

- `Author`
- `Post`

Create the author first if the person writing the post does not already exist in the CMS.

## Authors

An Author document contains a name and profile picture.

### When to create a new author

Create a new Author document only when the writer does not already exist.

If an author already has an entry, reuse it so their information stays consistent across posts.

### Profile picture

Use a clear image that can still work when displayed at a smaller size.

If the site later displays author profiles in more places, the same Author document can be reused without updating individual posts.

## Creating a Post

Create a new `Post` document in Sanity Studio.

### Title

Use the final public title of the article.

The schema warns when a title becomes very long because long titles can wrap awkwardly in blog cards.

Before publishing, check the title on the blog listing as well as on the article page.

### Slug

Generate the slug from the title using Sanity's slug control.

Example:

```text
apotheon-when-ancient-greek-pottery-became-a-video-game
```

The slug becomes part of the article URL.

Avoid changing the slug after an article has been published unless you intentionally want to change its URL. Existing links may stop working if the frontend does not provide a redirect.

### Excerpt

Write a short summary that works when the article appears in a BlogCard.

The excerpt should give the reader enough context to understand why the article may be worth opening without summarizing the whole post.

A useful excerpt usually:

- explains the main subject
- mentions the angle or question explored by the article
- avoids simply repeating the title
- fits comfortably in a blog card
- uses one or two short sentences

The excerpt is separate from the article body. It can also be reused later for other previews or metadata if needed.

### Published At

Set the date and time that should be shown for the article.

Posts are ordered using `publishedAt`, with the newest posts appearing first.

Check this value carefully if an older article is being added later, because changing it affects its position on the blog listing.

### Author

Select the Author document for the person who wrote the article.

Do not type an author name directly into the Post. The Post references the reusable Author document.

### Header Image

Upload or select the main image for the article.

Sanity hotspot support is enabled, so use the hotspot controls when the important subject needs to remain visible across different crops.

Check how the image looks both on the BlogCard and on the article page.

#### Alternative Text

Describe the useful visual information in the image.

Good alternative text should communicate what matters in the image without trying to describe every detail.

For example:

```text
Apotheon promotional artwork depicting five figures from Greek mythology in a black-figure pottery style.
```

Do not use the image credit as alternative text.

If an image is purely decorative and contributes no useful information, empty alternative text may be more appropriate.

#### Image Credit

Use this when the image should be attributed to a creator, studio, publication, photographer, or other source.

Keep the wording short and consistent.

#### Source URL

Add the public page where the image came from when a source link is useful or required.

Use the original source when possible instead of a repost.

### Content

Write the full article in the Content field.

Use headings to separate meaningful sections instead of creating very long uninterrupted blocks of text.

Before publishing:

- check heading order
- check links
- check paragraph spacing
- confirm quoted material is attributed
- preview the article if possible

The Content field is the article itself. The Excerpt field is only the short preview.

## Drafts and Publishing

Sanity keeps unpublished changes as drafts.

While writing:

1. Save changes normally in Studio.
2. Review the article and metadata.
3. Publish only when the post is ready to appear on the site.

When editing an article that is already public, publish the updated document after reviewing the changes.

## Editing an Existing Post

Open the existing Post document instead of creating another copy.

Normal corrections to content, images, or excerpts can be made without changing the slug.

Be especially careful with:

- slug changes
- publication date changes
- replacing credited images
- removing an author reference

## Before Publishing

Check:

- the title reads correctly
- the slug is final
- the excerpt works as preview copy
- the publication date is correct
- the correct author is selected
- the header image is cropped well
- meaningful images have useful alternative text
- image credit and source are included when needed
- headings are ordered properly
- links work
- the article formatting looks correct

## A Field Exists in Sanity but Is Missing on the Website

If a field is visible in Studio but appears as `undefined` on the frontend, check the entire data flow.

### 1. Check the document

Make sure the field actually contains a value and that the latest changes have been published.

### 2. Check the GROQ query

Sanity only returns fields requested by the projection.

For example:

```groq
{
  title,
  slug,
  excerpt
}
```

Adding `excerpt` to the schema does not automatically add it to an existing query.

### 3. Check the TypeScript type

If the frontend has a `BlogPost` type, add the field there as well.

Example:

```ts
excerpt?: string;
```

### 4. Check component props

Make sure the page passes the value to the component:

```astro
<BlogCard excerpt={post.excerpt} />
```

Then make sure the component accepts and renders the prop.

This sequence is the main thing to check whenever a new CMS field is added.
