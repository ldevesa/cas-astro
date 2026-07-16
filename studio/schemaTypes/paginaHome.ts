import {defineArrayMember, defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'

export const paginaHomeType = defineType({
  name: 'paginaHome',
  title: 'Página Home',
  type: 'document',
  icon: HomeIcon,
  // Documento singleton: hay uno solo, con _id fijo (ver studio/sanity.config.ts).
  fields: [
    defineField({
      name: 'bloques',
      title: 'Bloques',
      description: 'Las secciones de la home, en el orden en que aparecen en el sitio.',
      type: 'array',
      of: [defineArrayMember({type: 'heroBloque'})],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    prepare: () => ({title: 'Página Home'}),
  },
})
