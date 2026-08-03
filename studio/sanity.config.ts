import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {schemaTypes} from './schemaTypes'

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
            S.listItem()
              .title('Configuración de seguimiento')
              .id('configuracionSeguimiento')
              .child(S.document().schemaType('configuracionSeguimiento').documentId('configuracionSeguimiento')),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !['paginaHome', 'configuracionSeguimiento'].includes(item.getId() ?? '')
            ),
          ]),
    }),
    visionTool(),
    media(),
  ],

  schema: {
    types: schemaTypes,
  },
})
