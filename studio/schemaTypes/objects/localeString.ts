import {defineField, defineType} from 'sanity'

export const localeStringType = defineType({
  name: 'localeString',
  title: 'Texto localizado',
  type: 'object',
  fields: [
    defineField({name: 'es', title: 'Español', type: 'string'}),
    defineField({name: 'pt', title: 'Português', type: 'string'}),
    defineField({name: 'en', title: 'English', type: 'string'}),
  ],
  preview: {
    select: {title: 'es'},
  },
})
