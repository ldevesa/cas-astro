export interface SiteData {
  headline: string;
  subheadline: string;
  offices: { city: string; address: string }[];
  socialLinks: { platform: string; url: string }[];
}

export function getStaticSiteData(): SiteData {
  return {
    headline: 'Conectamos marcas con consumidores a través de experiencias memorables',
    subheadline: 'Captar la atención del consumidor',
    offices: [
      { city: 'Buenos Aires', address: 'Echeverría 760, Vte. López, Bs. As.' },
      { city: 'Ciudad de México', address: 'Av. Homero 1804, of. 204, Polanco, CDMX' },
      { city: 'Madrid', address: "C/ O'Donnell N°14 enpta, 28009" },
      { city: 'Miami', address: '1000 Brickell Ave, Suite 905, FL 33131' },
    ],
    socialLinks: [
      { platform: 'Instagram', url: 'https://www.instagram.com/contenidos.ad' },
      { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/contenidosad/' },
    ],
  };
}
