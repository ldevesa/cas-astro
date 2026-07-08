import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'
import {migracionField} from './objects/migracion'

export const carreraType = defineType({
  name: 'carrera',
  title: 'Carrera',
  type: 'document',
  icon: UserIcon,
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
      name: 'tipo',
      title: 'Tipo',
      description: 'La etiqueta visible se traduce en el frontend a partir de este valor',
      type: 'string',
      options: {
        list: [
          {title: 'Full Time', value: 'fulltime'},
          {title: 'Part Time', value: 'parttime'},
          {title: 'Freelance', value: 'freelance'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'categoria',
      title: 'Categoría',
      description: 'La etiqueta visible se traduce en el frontend a partir de este valor',
      type: 'string',
      options: {
        list: [
          {title: 'Junior', value: 'junior'},
          {title: 'Semi Senior', value: 'semi'},
          {title: 'Senior', value: 'senior'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'areaTrabajo',
      title: 'Área de trabajo',
      type: 'localeString',
    }),
    defineField({
      name: 'fecha',
      title: 'Fecha de publicación',
      type: 'date',
    }),
    defineField({
      name: 'contenido',
      title: 'Descripción del puesto',
      type: 'localeBlockContent',
    }),
    migracionField,
  ],
  preview: {
    select: {title: 'titulo.es', subtitle: 'categoria'},
  },
})
