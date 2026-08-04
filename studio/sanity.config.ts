import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {CodeIcon} from '@sanity/icons/Code'
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
  },
})
