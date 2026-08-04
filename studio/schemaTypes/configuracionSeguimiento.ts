import {defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

export const configuracionSeguimientoType = defineType({
  name: 'configuracionSeguimiento',
  title: 'Configuración de seguimiento',
  type: 'document',
  icon: CogIcon,
  // Documento singleton: hay uno solo, con _id fijo (ver studio/sanity.config.ts).
  fields: [
    defineField({
      name: 'googleTagManagerId',
      title: 'ID de Google Tag Manager',
      description: 'Formato GTM-XXXXXXX. Una vez cargado, Analytics, Facebook Pixel, Hotjar, etc. se agregan o cambian directamente desde el panel de Tag Manager (tagmanager.google.com) — no hace falta volver a tocar el sitio.',
      type: 'string',
      validation: (rule) => rule.regex(/^GTM-[A-Z0-9]+$/, {name: 'GTM ID', invert: false}).warning('El formato esperado es GTM-XXXXXXX'),
    }),
    defineField({
      name: 'googleSiteVerification',
      title: 'Código de verificación de Google Search Console',
      description: 'Solo el código (el valor del atributo content de la meta tag que da Google al verificar la propiedad), no la etiqueta completa.',
      type: 'string',
    }),
    defineField({
      name: 'scriptsPersonalizados',
      title: 'Scripts personalizados — antes de </head>',
      description: 'Para pegar tal cual cualquier snippet suelto que no pase por Tag Manager (Pixel de Facebook standalone, Hotjar, etc.). Se inserta antes del cierre de </head> en todas las páginas del sitio.',
      type: 'text',
      rows: 10,
    }),
    defineField({
      name: 'scriptsPersonalizadosBody',
      title: 'Scripts personalizados — después de <body>',
      description: 'Para snippets que vienen en 2 partes (una para el <head>, otra para el inicio del <body>, como el propio Tag Manager) — pegar acá tal cual la parte que el proveedor indique poner ahí. Se inserta justo después de que abre la etiqueta <body>, en todas las páginas.',
      type: 'text',
      rows: 10,
    }),
    defineField({
      name: 'scriptsPersonalizadosFinBody',
      title: 'Scripts personalizados — antes de </body>',
      description: 'Para scripts que necesitan que toda la página ya esté cargada antes de ejecutarse (algunos widgets de chat, ciertos tags de medición). Se inserta justo antes del cierre de </body>, en todas las páginas.',
      type: 'text',
      rows: 10,
    }),
  ],
  preview: {
    prepare: () => ({title: 'Configuración de seguimiento'}),
  },
})
