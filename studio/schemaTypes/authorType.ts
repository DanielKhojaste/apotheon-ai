import {defineType} from 'sanity'

export const authorType = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineType({
      name: 'id',
      title: 'ID',
      type: 'string',
    }),
    defineType({
      name: 'name',
      title: 'Name',
      type: 'string',
    }),
    defineType({
      name: 'profilePicture',
      title: 'Profile Picture',
      type: 'image',
    }),
  ],
})
