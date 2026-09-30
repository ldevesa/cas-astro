// Fuente única de las categorías de caso: la usan el schema del Studio (caso.ts)
// y el sitio (src/lib/cms.ts → páginas /casos/categoria/[categoria]).
// Agregar/renombrar acá actualiza los dos lados. Solo datos: sin imports de
// `sanity`, para que el sitio Astro pueda importarlo sin cargar el Studio.
// El `value` es el slug de la URL y lo que se guarda en cada caso: si se cambia,
// hay que re-etiquetar los casos que lo usaban.

export const CATEGORIAS_CASO = [
  {value: 'experiencia', title: {es: 'Experiencia', pt: 'Experiência', en: 'Experience'}},
  {value: 'contenido-digital', title: {es: 'Contenido Digital', pt: 'Conteúdo Digital', en: 'Digital Content'}},
  {value: 'trade', title: {es: 'Trade', pt: 'Trade', en: 'Trade'}},
  {value: 'creatividad', title: {es: 'Creatividad', pt: 'Criatividade', en: 'Creativity'}},
] as const

export type CategoriaCaso = (typeof CATEGORIAS_CASO)[number]['value']
