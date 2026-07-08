import {defineField, defineType, defineArrayMember} from 'sanity'

const bodyBlocks = [
  defineArrayMember({
    type: 'block',
    styles: [
      {title: 'Normal', value: 'normal'},
      {title: 'H2', value: 'h2'},
      {title: 'H3', value: 'h3'},
      {title: 'Cita', value: 'blockquote'},
    ],
    lists: [
      {title: 'Viñetas', value: 'bullet'},
      {title: 'Numerada', value: 'number'},
    ],
    marks: {
      decorators: [
        {title: 'Negrita', value: 'strong'},
        {title: 'Cursiva', value: 'em'},
      ],
      annotations: [
        defineArrayMember({
          name: 'link',
          type: 'object',
          title: 'Link',
          fields: [defineField({name: 'href', type: 'url', title: 'URL'})],
        }),
      ],
    },
  }),
]

export const localeBlockContentType = defineType({
  name: 'localeBlockContent',
  title: 'Contenido localizado',
  type: 'object',
  fields: [
    defineField({name: 'es', title: 'Español', type: 'array', of: bodyBlocks}),
    defineField({name: 'pt', title: 'Português', type: 'array', of: bodyBlocks}),
    defineField({name: 'en', title: 'English', type: 'array', of: bodyBlocks}),
  ],
})
