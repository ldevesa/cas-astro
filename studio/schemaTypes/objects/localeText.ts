import {defineField, defineType} from 'sanity'

export const localeTextType = defineType({
  name: 'localeText',
  title: 'Párrafo localizado',
  type: 'object',
  fields: [
    defineField({name: 'es', title: 'Español', type: 'text', rows: 3}),
    defineField({name: 'pt', title: 'Português', type: 'text', rows: 3}),
    defineField({name: 'en', title: 'English', type: 'text', rows: 3}),
  ],
  preview: {
    select: {title: 'es'},
  },
})
