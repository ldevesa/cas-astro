/**
 * Cloudflare Pages Function — POST /api/contact
 * Recibe el formulario de contacto y manda 2 emails independientes,
 * replicando el "Mail 1 / Mail 2" que tenían en Contact Form 7 (WordPress):
 *
 * - Vendedores (CONTACT_TO): sin datos de UTM/origen del contacto.
 * - Marketing (CONTACT_TO_MARKETING): con esos datos, para medir.
 *
 * Cada uno se manda vía Mailjet, con Resend como fallback automático si
 * Mailjet falla — y son independientes entre sí: si uno de los dos falla
 * del todo (agotando su propio fallback), el otro se intenta igual. La
 * respuesta es éxito si al menos uno de los dos se mandó.
 *
 * Mailjet bloqueó la cuenta en julio 2026 (problema del proveedor, no de
 * config), así que Resend pasó a ser el principal por un tiempo. Con
 * Mailjet desbloqueado y sus keys renovadas (agosto 2026), vuelve a ser el
 * proveedor principal. Cada proveedor usa su propio remitente verificado
 * (ver FROM_EMAIL_MJ / FROM_EMAIL_RESEND más abajo) — no comparten el
 * mismo remitente porque cada uno tiene verificado un dominio distinto.
 * Cloudflare Pages Functions no soporta sockets TCP crudos, así que
 * cualquier proveedor tiene que hablar por API HTTP, no SMTP directo.
 * Ver MANUAL.md para más contexto.
 */
/** Escapa HTML para no inyectar markup/scripts en el email armado a partir de datos del visitante. */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendViaMailjet({ key, secret, fromEmail, fromName, toList, bccList, subject, replyName, replyEmail, html }) {
  const message = {
    From:     { Email: fromEmail, Name: fromName },
    To:       toList.map(e => ({ Email: e })),
    ReplyTo:  { Email: replyEmail, Name: replyName },
    Subject:  subject,
    HTMLPart: html,
  };
  if (bccList.length > 0) message.Bcc = bccList.map(e => ({ Email: e }));

  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
    },
    body: JSON.stringify({ Messages: [message] }),
  });

  if (!res.ok) {
    console.error('Mailjet error:', await res.text());
    return false;
  }
  return true;
}

async function sendViaResend({ key, fromEmail, fromName, toList, bccList, subject, replyName, replyEmail, html }) {
  const message = {
    from:     `${fromName} <${fromEmail}>`,
    to:       toList,
    reply_to: `${replyName} <${replyEmail}>`,
    subject,
    html,
  };
  if (bccList.length > 0) message.bcc = bccList;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    console.error('Resend error:', await res.text());
    return false;
  }
  return true;
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
  const RESEND_KEY = env.RESEND_API_KEY;
  // Desactivar el fallback a Resend sin borrar la key: RESEND_FALLBACK_ENABLED=false
  const resendFallbackEnabled = env.RESEND_FALLBACK_ENABLED !== 'false' && !!RESEND_KEY;

  // Cada proveedor tiene verificado un remitente distinto — no se comparten.
  const FROM_EMAIL_MJ     = env.CONTACT_FROM_EMAIL ?? 'info@contenidosad.com';
  // onboarding@resend.dev funciona sin verificar dominio, pero en modo sandbox
  // Resend solo entrega al email con el que se creó la cuenta — cuando se
  // verifique contenidosad.com en Resend, cambiar RESEND_FROM_EMAIL a algo
  // de ese dominio para poder mandar a cualquiera también desde el fallback.
  const FROM_EMAIL_RESEND = env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const FROM_NAME = env.CONTACT_FROM_NAME ?? 'CAS';
  const toVendedoresRaw = env.CONTACT_TO ?? 'info@contenidosad.com';
  const toMarketingRaw  = env.CONTACT_TO_MARKETING ?? '';
  const bccRaw = env.CONTACT_BCC ?? '';

  const mailjetConfigured = !!MJ_KEY && !!MJ_SECRET;
  if (!mailjetConfigured && !resendFallbackEnabled) {
    return Response.json({ ok: false, error: 'Configuración de email incompleta.' }, { status: 500 });
  }

  const parseEmails = (raw) => raw.split(',').map(e => e.trim()).filter(Boolean);

  const toVendedores = parseEmails(toVendedoresRaw);
  const toMarketing  = parseEmails(toMarketingRaw);
  const bccList = parseEmails(bccRaw);

  const htmlBase = `
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
  `;

  const htmlOrigen = (utmSource || utmMedium || utmCampaign || utmTerm || utmContent || dispositivo) ? `
    <h3>Origen del contacto</h3>
    <table cellpadding="6" style="border-collapse:collapse;">
      ${utmSource   ? `<tr><td><strong>Fuente:</strong></td><td>${escapeHtml(utmSource)}</td></tr>` : ''}
      ${utmMedium   ? `<tr><td><strong>Medio:</strong></td><td>${escapeHtml(utmMedium)}</td></tr>` : ''}
      ${utmCampaign ? `<tr><td><strong>Campaña:</strong></td><td>${escapeHtml(utmCampaign)}</td></tr>` : ''}
      ${utmTerm     ? `<tr><td><strong>Término:</strong></td><td>${escapeHtml(utmTerm)}</td></tr>` : ''}
      ${utmContent  ? `<tr><td><strong>Contenido del anuncio:</strong></td><td>${escapeHtml(utmContent)}</td></tr>` : ''}
      ${dispositivo ? `<tr><td><strong>Dispositivo:</strong></td><td>${escapeHtml(dispositivo)}</td></tr>` : ''}
    </table>
  ` : '';

  const subject = `[CAS Sitio] Mensaje de ${nombre}${empresa ? ` — ${empresa}` : ''}`;

  const trySend = async (toList, bccList, html) => {
    let sent = false;
    if (mailjetConfigured) {
      sent = await sendViaMailjet({ key: MJ_KEY, secret: MJ_SECRET, fromEmail: FROM_EMAIL_MJ, fromName: FROM_NAME, toList, bccList, subject, replyName: nombre, replyEmail: email, html });
    }
    if (!sent && resendFallbackEnabled) {
      console.error('Mailjet falló o no está configurado, reintentando con Resend.');
      sent = await sendViaResend({ key: RESEND_KEY, fromEmail: FROM_EMAIL_RESEND, fromName: FROM_NAME, toList, bccList, subject, replyName: nombre, replyEmail: email, html });
    }
    return sent;
  };

  const sentVendedores = toVendedores.length > 0 ? await trySend(toVendedores, [], htmlBase) : false;
  const sentMarketing  = toMarketing.length  > 0 ? await trySend(toMarketing, bccList, htmlBase + htmlOrigen) : false;

  if (!sentVendedores && !sentMarketing) {
    return Response.json({ ok: false, error: 'Error al enviar el mensaje.' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
