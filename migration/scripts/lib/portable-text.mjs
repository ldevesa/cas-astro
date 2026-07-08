import { JSDOM } from 'jsdom';
import { htmlToBlocks } from '@portabletext/block-tools';
import { Schema } from '@sanity/schema';

// Debe reflejar los `bodyBlocks` de studio/schemaTypes/objects/localeBlockContent.ts
const schema = Schema.compile({
  name: 'migration',
  types: [
    {
      name: 'body',
      type: 'object',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [
                { title: 'Normal', value: 'normal' },
                { title: 'H2', value: 'h2' },
                { title: 'H3', value: 'h3' },
                { title: 'Cita', value: 'blockquote' },
              ],
              lists: [
                { title: 'Viñetas', value: 'bullet' },
                { title: 'Numerada', value: 'number' },
              ],
              marks: {
                decorators: [
                  { title: 'Negrita', value: 'strong' },
                  { title: 'Cursiva', value: 'em' },
                ],
                annotations: [{ name: 'link', type: 'object', fields: [{ name: 'href', type: 'url' }] }],
              },
            },
          ],
        },
      ],
    },
  ],
});

const blockContentType = schema.get('body').fields.find((f) => f.name === 'content').type;

/** Convierte HTML (content.rendered de WP) a un array de bloques de Portable Text. */
export function htmlToPortableText(html) {
  if (!html || !html.trim()) return undefined;
  const blocks = htmlToBlocks(html, blockContentType, {
    parseHtml: (h) => new JSDOM(h).window.document,
  });
  return blocks.length ? blocks : undefined;
}
