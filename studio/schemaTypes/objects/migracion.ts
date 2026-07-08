import {defineField} from 'sanity'

export const migracionField = defineField({
  name: 'migracion',
  title: 'Migración (WordPress)',
  type: 'object',
  readOnly: true,
  options: {collapsible: true, collapsed: true},
  fields: [
    defineField({name: 'sourceSystem', title: 'Sistema de origen', type: 'string'}),
    defineField({name: 'sourceId', title: 'ID en WordPress', type: 'number'}),
    defineField({name: 'sourceUrl', title: 'URL original', type: 'url'}),
  ],
})
