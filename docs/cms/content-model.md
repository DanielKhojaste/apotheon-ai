# CMS Content Model

Sanity Studio and the CMS schemas live in `studio/`.

The blog currently uses two document types: `Author` and `Post`.

## Author

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Reused by posts through a reference |
| `profilePicture` | image | Can be reused anywhere author information is displayed |

Posts reference Author documents instead of storing an author name directly.

This avoids repeating author information across multiple posts.

## Post

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Required and used as the public article title |
| `slug` | slug | Required and used for the article route |
| `excerpt` | text | Short preview copy for BlogCards and listings |
| `publishedAt` | datetime | Used for the displayed date and post ordering |
| `author` | reference | Required reference to an Author document |
| `headerImage` | image | Main image with hotspot support |
| `headerImage.alt` | string | Alternative text for the image |
| `headerImage.credit` | string | Optional image attribution |
| `headerImage.sourceUrl` | URL | Optional original source |
| `content` | Portable Text array | Required full article body |

## Excerpt and Content

These fields have different purposes.

### `excerpt`

Use the excerpt when only a short preview of the article is needed.

Current use:

- BlogCard

Possible later uses:

- featured article previews
- search results
- related-post cards
- metadata descriptions

### `content`

Use `content` only for the full article body.

Do not derive the article body from the excerpt.

## Frontend Data Flow

Blog content moves through four main steps:

```text
Sanity document
    |
    v
GROQ projection
    |
    v
Astro page
    |
    v
Component props
```

A field must make it through each step before it can be rendered.

## GROQ

A blog listing does not need to fetch the full Portable Text article body.

A listing query can request only the fields needed by BlogCard:

```groq
*[_type == "post" && defined(slug.current)]
| order(publishedAt desc, _createdAt desc) {
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  "authorName": author->name,
  "headerImageUrl": headerImage.asset->url,
  "headerImageAlt": headerImage.alt
}
```

Article pages can use a separate query that also requests `content` and any image attribution needed by the full article layout.

Keeping the queries focused avoids fetching content that the page does not use.

## Adding a New CMS Field

When adding a new field, update every layer that needs it.

1. Add the field to the Post or Author schema in `studio/`.
2. Add useful validation or editor guidance.
3. Add the field to the relevant GROQ projection.
4. Update the frontend TypeScript type.
5. Pass the value to the component that needs it.
6. Render or otherwise use the value.
7. Update the Blog Authoring Guide if an editor needs to understand how to fill it in.

Not every schema field needs to appear in every GROQ query.

For example, the blog listing can fetch the excerpt without fetching the entire article body.

## Images

Header image metadata is stored with the image field so it stays associated with the asset used by that post.

The frontend can use:

- `headerImage.asset->url` for the image URL
- `headerImage.alt` for alternative text
- `headerImage.credit` when attribution is displayed
- `headerImage.sourceUrl` when a source link is displayed

Sanity hotspot data can be used when the frontend image pipeline supports it.
