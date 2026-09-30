import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {CodeIcon} from '@sanity/icons/Code'
import {schemaTypes} from './schemaTypes'

// Documentos únicos: el sitio lee exactamente el _id fijo, así que una copia
// quedaría ignorada en silencio. Se editan y publican, pero no se crean desde
// "Crear nuevo", ni se duplican, borran o despublican.
const SINGLETON_TYPES = new Set(['paginaHome', 'configuracionSeguimiento'])
const SINGLETON_ACTIONS = new Set(['publish', 'discardChanges', 'restore'])

export default defineConfig({
  name: 'default',
  title: 'cas-sitio',

  projectId: '21wszpvy',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Contenido')
          .items([
            S.listItem()
              .title('Página Home')
              .id('paginaHome')
              .child(S.document().schemaType('paginaHome').documentId('paginaHome')),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !['paginaHome', 'configuracionSeguimiento'].includes(item.getId() ?? '')
            ),
            S.divider(),
            S.listItem()
              .title('Configuración de seguimiento')
              .id('configuracionSeguimiento')
              .icon(CodeIcon)
              .child(S.document().schemaType('configuracionSeguimiento').documentId('configuracionSeguimiento')),
          ]),
    }),
    visionTool(),
    media(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !SINGLETON_TYPES.has(schemaType)),
  },

  document: {
    actions: (input, context) =>
      SINGLETON_TYPES.has(context.schemaType)
        ? input.filter(({action}) => action && SINGLETON_ACTIONS.has(action))
        : input,
  },
})
