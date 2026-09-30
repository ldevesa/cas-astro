// Globales que crean scripts cargados en runtime (no importados), para que TypeScript los conozca.

interface Window {
  // amCharts 5, cargado desde cdn.amcharts.com por CoberturaGlobo.astro
  am5?: unknown;
  am5map?: unknown;
  am5geodata_worldLow?: unknown;
  // Definida en public/assets/globo/globo.js
  initCasGlobe?: () => void;
}
