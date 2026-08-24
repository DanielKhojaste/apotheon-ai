import {defineField, defineType} from 'sanity'

export const postType = defineType({
	name: 'post',
	title: 'Post',
	type: 'document',
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (rule) => [
				rule.required().error('Title is required.'),
				rule.max(80).warning('Long titles may not display well in blog cards.'),
			],
		}),

		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96,
			},
			validation: (rule) => rule.required(),
		}),

		defineField({
			name: 'excerpt',
			title: 'Excerpt',
			type: 'text',
			rows: 3,
			description: 'A short summary used in blog listings and previews.',
			validation: (rule) => [
				rule.required().error('Excerpt is required.'),
				rule.max(220).warning('Keep excerpts under 220 characters for consistent blog cards.'),
			],
		}),

		defineField({
			name: 'publishedAt',
			title: 'Published At',
			type: 'datetime',
		}),

		defineField({
			name: 'author',
			title: 'Author',
			type: 'reference',
			to: [{type: 'author'}],
			validation: (rule) => rule.required().error('Author is required.'),
		}),

		defineField({
			name: 'headerImage',
			title: 'Header Image',
			type: 'image',
			options: {
				hotspot: true,
			},
			fields: [
				defineField({
					name: 'alt',
					title: 'Alternative Text',
					type: 'string',
				}),
				defineField({
					name: 'credit',
					title: 'Image Credit',
					type: 'string',
				}),
				defineField({
					name: 'sourceUrl',
					title: 'Source URL',
					type: 'url',
				}),
			],
		}),

		defineField({
			name: 'content',
			title: 'Content',
			type: 'array',
			of: [{type: 'block'}],
			validation: (rule) => rule.required().min(1).error('Content is required.'),
		}),
	],
})
