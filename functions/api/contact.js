/**
 * Cloudflare Pages Function — POST /api/contact
 * Recibe el formulario de contacto y lo envía via Mailjet API.
 */
/** Escapa HTML para no inyectar markup/scripts en el email armado a partir de datos del visitante. */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function onRequestPost({ request, env }) {
  const data = await request.formData();

  const nombre   = data.get('nombre')?.trim()   ?? data.get('name')?.trim()    ?? '';
  const empresa  = data.get('empresa')?.trim()  ?? data.get('company')?.trim() ?? '';
  const email    = data.get('email')?.trim()    ?? '';
  const telefono = data.get('telefono')?.trim() ?? data.get('phone')?.trim()   ?? '';
  const cargo    = data.get('cargo')?.trim()    ?? data.get('role')?.trim()    ?? '';
  const pais     = data.get('pais')?.trim()     ?? data.get('country')?.trim() ?? '';
  const servicio = data.get('servicio')         ?? data.get('service')         ?? '';
  const mensaje  = data.get('mensaje')?.trim()  ?? data.get('message')?.trim() ?? '';

  // Fuente de tráfico (ver src/layouts/Layout.astro — capturarUtm) y dispositivo, opcionales.
  const utmSource   = data.get('utm_source')?.trim()   ?? '';
  const utmMedium   = data.get('utm_medium')?.trim()   ?? '';
  const utmCampaign = data.get('utm_campaign')?.trim() ?? '';
  const utmTerm     = data.get('utm_term')?.trim()     ?? '';
  const utmContent  = data.get('utm_content')?.trim()  ?? '';
  const dispositivo = data.get('dispositivo')?.trim()  ?? '';

  if (!nombre || !email || !mensaje) {
    return Response.json({ ok: false, error: 'Faltan campos obligatorios.' }, { status: 400 });
  }

  const MJ_KEY    = env.MJ_APIKEY_PUBLIC;
  const MJ_SECRET = env.MJ_APIKEY_PRIVATE;
  const FROM_EMAIL = env.CONTACT_FROM_EMAIL ?? 'info@contenidosad.com';
  const FROM_NAME  = env.CONTACT_FROM_NAME  ?? 'CAS';
  const toRaw      = env.CONTACT_TO  ?? 'info@contenidosad.com';
  const bccRaw     = env.CONTACT_BCC ?? '';

  if (!MJ_KEY || !MJ_SECRET) {
    return Response.json({ ok: false, error: 'Configuración de email incompleta.' }, { status: 500 });
  }

  const parseEmails = (raw) =>
    raw.split(',').map(e => e.trim()).filter(Boolean).map(e => ({ Email: e }));

  const toList  = parseEmails(toRaw);
  const bccList = parseEmails(bccRaw);

  const htmlBody = `
    <h2>Nuevo mensaje desde el sitio CAS</h2>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td><strong>Nombre:</strong></td><td>${escapeHtml(nombre)}</td></tr>
      ${empresa  ? `<tr><td><strong>Empresa:</strong></td><td>${escapeHtml(empresa)}</td></tr>` : ''}
      ${cargo    ? `<tr><td><strong>Cargo:</strong></td><td>${escapeHtml(cargo)}</td></tr>` : ''}
      ${pais     ? `<tr><td><strong>País:</strong></td><td>${escapeHtml(pais)}</td></tr>` : ''}
      <tr><td><strong>Email:</strong></td><td>${escapeHtml(email)}</td></tr>
      ${telefono ? `<tr><td><strong>Teléfono:</strong></td><td>${escapeHtml(telefono)}</td></tr>` : ''}
      ${servicio ? `<tr><td><strong>Servicio:</strong></td><td>${escapeHtml(servicio)}</td></tr>` : ''}
      <tr><td valign="top"><strong>Mensaje:</strong></td><td>${escapeHtml(mensaje).replace(/\n/g, '<br>')}</td></tr>
    </table>
    ${(utmSource || utmMedium || utmCampaign || utmTerm || utmContent || dispositivo) ? `
    <h3>Origen del contacto</h3>
    <table cellpadding="6" style="border-collapse:collapse;">
      ${utmSource   ? `<tr><td><strong>Fuente:</strong></td><td>${escapeHtml(utmSource)}</td></tr>` : ''}
      ${utmMedium   ? `<tr><td><strong>Medio:</strong></td><td>${escapeHtml(utmMedium)}</td></tr>` : ''}
      ${utmCampaign ? `<tr><td><strong>Campaña:</strong></td><td>${escapeHtml(utmCampaign)}</td></tr>` : ''}
      ${utmTerm     ? `<tr><td><strong>Término:</strong></td><td>${escapeHtml(utmTerm)}</td></tr>` : ''}
      ${utmContent  ? `<tr><td><strong>Contenido del anuncio:</strong></td><td>${escapeHtml(utmContent)}</td></tr>` : ''}
      ${dispositivo ? `<tr><td><strong>Dispositivo:</strong></td><td>${escapeHtml(dispositivo)}</td></tr>` : ''}
    </table>
    ` : ''}
  `;

  const message = {
    From:     { Email: FROM_EMAIL, Name: FROM_NAME },
    To:       toList,
    ReplyTo:  { Email: email, Name: nombre },
    Subject:  `[CAS Sitio] Mensaje de ${nombre}${empresa ? ` — ${empresa}` : ''}`,
    HTMLPart: htmlBody,
  };

  if (bccList.length > 0) message.Bcc = bccList;

  const mjRes = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${MJ_KEY}:${MJ_SECRET}`)}`,
    },
    body: JSON.stringify({ Messages: [message] }),
  });

  if (!mjRes.ok) {
    const err = await mjRes.text();
    console.error('Mailjet error:', err);
    return Response.json({ ok: false, error: 'Error al enviar el mensaje.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
