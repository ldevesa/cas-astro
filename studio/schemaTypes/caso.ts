import {defineField, defineType} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'
import {migracionField} from './objects/migracion'

export const casoType = defineType({
  name: 'caso',
  title: 'Caso',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'localeString',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      description: 'Siempre en español, se usa igual en las 3 versiones de idioma',
      type: 'slug',
      options: {source: 'titulo.es'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitulo',
      title: 'Subtítulo',
      type: 'localeString',
    }),
    defineField({
      name: 'resumen',
      title: 'Resumen',
      type: 'localeText',
    }),
    defineField({
      name: 'mercado',
      title: 'Mercado',
      type: 'localeString',
    }),
    defineField({
      name: 'contenido',
      title: 'Contenido',
      type: 'localeBlockContent',
    }),
    defineField({
      name: 'imagenDestacada',
      title: 'Imagen destacada',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'galeria',
      title: 'Galería',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
        },
      ],
    }),
    defineField({
      name: 'videoYoutubeId',
      title: 'ID de video de YouTube',
      description: 'Solo el ID del video (lo que va después de /embed/)',
      type: 'string',
    }),
    defineField({
      name: 'categorias',
      title: 'Categorías / Servicios',
      description: 'A qué servicio(s) de la Home corresponde este caso — se usa para el filtro en /casos/categoria/... Se puede dejar vacío mientras no esté definido, y un caso puede tener más de una.',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'Experiencia', value: 'experiencia'},
          {title: 'Contenido Digital', value: 'contenido-digital'},
          {title: 'Trade', value: 'trade'},
          {title: 'Creatividad', value: 'creatividad'},
        ],
      },
    }),
    migracionField,
  ],
  preview: {
    select: {title: 'titulo.es', media: 'imagenDestacada'},
  },
})
