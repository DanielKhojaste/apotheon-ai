import {defineField, defineType} from 'sanity'

export const authorType = defineType({
	name: 'author',
	title: 'Author',
	type: 'document',
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
			type: 'string',
		}),

		defineField({
			name: 'profilePicture',
			title: 'Profile Picture',
			type: 'image',
		}),
	],
})
