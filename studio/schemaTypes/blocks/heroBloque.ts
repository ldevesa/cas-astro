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
      name: 'mostrarTitulo',
      title: 'Mostrar texto sobre el video',
      description: 'Desactivado: el título queda guardado pero no se muestra en el sitio (útil para un video que se quiera ver solo, sin texto encima, sin perder lo ya escrito).',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'fuenteVideo',
      title: 'Fuente del video',
      type: 'string',
      options: {
        list: [
          {title: 'Video incrustado (archivo subido)', value: 'incrustado'},
          {title: 'Vimeo', value: 'vimeo'},
          {title: 'YouTube', value: 'youtube'},
        ],
        layout: 'radio',
      },
      initialValue: 'incrustado',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'video',
      title: 'Video de fondo',
      description: 'MP4, recomendado menos de 10MB. No lleva audio (se silencia automáticamente).',
      type: 'file',
      options: {accept: 'video/mp4'},
      hidden: ({parent}) => parent?.fuenteVideo !== 'incrustado',
      validation: (rule) =>
        rule.custom((value, context: any) =>
          context.parent?.fuenteVideo === 'incrustado' && !value
            ? 'Requerido cuando la fuente es "Video incrustado"'
            : true
        ),
    }),
    defineField({
      name: 'videoUrl',
      title: 'URL del video',
      description: 'Pegar la URL completa (ej: https://vimeo.com/1197710557 o https://www.youtube.com/watch?v=XXXXXXXXXXX).',
      type: 'url',
      hidden: ({parent}) => parent?.fuenteVideo === 'incrustado',
      validation: (rule) =>
        rule.custom((value, context: any) =>
          context.parent?.fuenteVideo !== 'incrustado' && !value
            ? 'Requerido cuando la fuente es Vimeo o YouTube'
            : true
        ),
    }),
    defineField({
      name: 'efectoActivo',
      title: 'Aplicar efecto ASCII sobre el video',
      description: 'Activado: se ve el video procesado con el efecto de puntos naranjas. Desactivado: se ve el video de fondo tal cual, sin procesar. Solo disponible con video incrustado — un embed de Vimeo/YouTube no permite leer sus píxeles por seguridad del navegador.',
      type: 'boolean',
      initialValue: true,
      hidden: ({parent}) => parent?.fuenteVideo !== 'incrustado',
    }),
  ],
  preview: {
    select: {title: 'titulo.es'},
    prepare: ({title}) => ({title: title, subtitle: 'Hero'}),
  },
})
