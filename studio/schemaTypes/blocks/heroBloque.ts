import {defineField, defineType} from 'sanity'
import {ImagesIcon} from '@sanity/icons/Images'

export const heroBloqueType = defineType({
  name: 'heroBloque',
  title: 'Hero',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'localeText',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'video',
      title: 'Video de fondo',
      description: 'MP4, recomendado menos de 10MB. No lleva audio (se silencia automáticamente).',
      type: 'file',
      options: {accept: 'video/mp4'},
    }),
    defineField({
      name: 'efectoActivo',
      title: 'Aplicar efecto ASCII sobre el video',
      description: 'Activado: se ve el video procesado con el efecto de puntos naranjas. Desactivado: se ve el video de fondo tal cual, sin procesar.',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {title: 'titulo.es'},
    prepare: ({title}) => ({title: title, subtitle: 'Hero'}),
  },
})
