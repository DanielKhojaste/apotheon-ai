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
		}),

		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
		}),

		defineField({
			name: 'createdAt',
			title: 'Created At',
			type: 'datetime',
		}),

		defineField({
			name: 'author',
			title: 'Author',
			type: 'reference',
			to: [{type: 'author'}],
		}),

		defineField({
			name: 'headerImage',
			title: 'Header Image',
			type: 'image',
		}),

		defineField({
			name: 'content',
			title: 'Content',
			type: 'array',
			of: [{type: 'block'}],
		}),
	],
})
