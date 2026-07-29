import {defineField, defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'
import {migracionField} from './objects/migracion'

export const clienteType = defineType({
  name: 'cliente',
  title: 'Cliente',
  type: 'document',
  icon: UsersIcon,
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      validation: (rule) => rule.required(),
    }),
    migracionField,
  ],
  preview: {
    select: {title: 'nombre', media: 'logo'},
  },
})
