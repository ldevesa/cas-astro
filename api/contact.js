/**
 * Vercel Serverless Function — POST /api/contact
 * Recibe el formulario de contacto y lo envía via Mailjet, con Resend como
 * fallback automático si Mailjet falla.
 *
 * Mailjet bloqueó la cuenta en julio 2026 (problema del proveedor, no de
 * config), así que Resend pasó a ser el principal por un tiempo. Con
 * Mailjet desbloqueado y sus keys renovadas (agosto 2026), vuelve a ser el
 * proveedor principal — pero Resend queda como fallback automático, ya
 * que quedó integrado y probado y el bloqueo de Mailjet puede repetirse.
 * Cada proveedor usa su propio remitente verificado (ver FROM_EMAIL_MJ /
 * FROM_EMAIL_RESEND más abajo) — no comparten el mismo remitente porque
 * cada uno tiene verificado un dominio distinto.
 * Ver functions/api/contact.js (el equivalente para Cloudflare) y
 * MANUAL.md para más contexto.
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
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const {
    nombre, name, empresa, company, email, telefono, phone, cargo, role, pais, country, servicio, service, mensaje, message,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, dispositivo,
  } = req.body;

  const _nombre   = nombre?.trim()   ?? name?.trim()    ?? '';
  const _empresa  = empresa?.trim()  ?? company?.trim() ?? '';
  const _email    = email?.trim()    ?? '';
  const _telefono = telefono?.trim() ?? phone?.trim()   ?? '';
  const _cargo    = cargo?.trim()    ?? role?.trim()    ?? '';
  const _pais     = pais?.trim()     ?? country?.trim() ?? '';
  const _servicio = servicio         ?? service         ?? '';
  const _mensaje  = mensaje?.trim()  ?? message?.trim() ?? '';

  // Fuente de tráfico (ver src/layouts/Layout.astro — capturarUtm) y dispositivo, opcionales.
  const _utmSource   = utm_source?.trim()   ?? '';
  const _utmMedium   = utm_medium?.trim()   ?? '';
  const _utmCampaign = utm_campaign?.trim() ?? '';
  const _utmTerm     = utm_term?.trim()     ?? '';
  const _utmContent  = utm_content?.trim()  ?? '';
  const _dispositivo = dispositivo?.trim()  ?? '';

  if (!_nombre || !_email || !_mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
  }

  const MJ_KEY    = process.env.MJ_APIKEY_PUBLIC;
  const MJ_SECRET = process.env.MJ_APIKEY_PRIVATE;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  // Desactivar el fallback a Resend sin borrar la key: RESEND_FALLBACK_ENABLED=false
  const resendFallbackEnabled = process.env.RESEND_FALLBACK_ENABLED !== 'false' && !!RESEND_KEY;

  // Cada proveedor tiene verificado un remitente distinto — no se comparten.
  const FROM_EMAIL_MJ     = process.env.CONTACT_FROM_EMAIL ?? 'info@contenidosad.com';
  // onboarding@resend.dev funciona sin verificar dominio, pero en modo sandbox
  // Resend solo entrega al email con el que se creó la cuenta — cuando se
  // verifique contenidosad.com en Resend, cambiar RESEND_FROM_EMAIL a algo
  // de ese dominio para poder mandar a cualquiera también desde el fallback.
  const FROM_EMAIL_RESEND = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const FROM_NAME = process.env.CONTACT_FROM_NAME ?? 'CAS';
  const toRaw      = process.env.CONTACT_TO  ?? 'info@contenidosad.com';
  const bccRaw     = process.env.CONTACT_BCC ?? '';

  const mailjetConfigured = !!MJ_KEY && !!MJ_SECRET;
  if (!mailjetConfigured && !resendFallbackEnabled) {
    return res.status(500).json({ ok: false, error: 'Configuración de email incompleta.' });
  }

  const parseEmails = (raw) => raw.split(',').map(e => e.trim()).filter(Boolean);

  const toList  = parseEmails(toRaw);
  const bccList = parseEmails(bccRaw);

  const htmlBody = `
    <h2>Nuevo mensaje desde el sitio CAS</h2>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td><strong>Nombre:</strong></td><td>${escapeHtml(_nombre)}</td></tr>
      ${_empresa  ? `<tr><td><strong>Empresa:</strong></td><td>${escapeHtml(_empresa)}</td></tr>` : ''}
      ${_cargo    ? `<tr><td><strong>Cargo:</strong></td><td>${escapeHtml(_cargo)}</td></tr>` : ''}
      ${_pais     ? `<tr><td><strong>País:</strong></td><td>${escapeHtml(_pais)}</td></tr>` : ''}
      <tr><td><strong>Email:</strong></td><td>${escapeHtml(_email)}</td></tr>
      ${_telefono ? `<tr><td><strong>Teléfono:</strong></td><td>${escapeHtml(_telefono)}</td></tr>` : ''}
      ${_servicio ? `<tr><td><strong>Servicio:</strong></td><td>${escapeHtml(_servicio)}</td></tr>` : ''}
      <tr><td valign="top"><strong>Mensaje:</strong></td><td>${escapeHtml(_mensaje).replace(/\n/g, '<br>')}</td></tr>
    </table>
    ${(_utmSource || _utmMedium || _utmCampaign || _utmTerm || _utmContent || _dispositivo) ? `
    <h3>Origen del contacto</h3>
    <table cellpadding="6" style="border-collapse:collapse;">
      ${_utmSource   ? `<tr><td><strong>Fuente:</strong></td><td>${escapeHtml(_utmSource)}</td></tr>` : ''}
      ${_utmMedium   ? `<tr><td><strong>Medio:</strong></td><td>${escapeHtml(_utmMedium)}</td></tr>` : ''}
      ${_utmCampaign ? `<tr><td><strong>Campaña:</strong></td><td>${escapeHtml(_utmCampaign)}</td></tr>` : ''}
      ${_utmTerm     ? `<tr><td><strong>Término:</strong></td><td>${escapeHtml(_utmTerm)}</td></tr>` : ''}
      ${_utmContent  ? `<tr><td><strong>Contenido del anuncio:</strong></td><td>${escapeHtml(_utmContent)}</td></tr>` : ''}
      ${_dispositivo ? `<tr><td><strong>Dispositivo:</strong></td><td>${escapeHtml(_dispositivo)}</td></tr>` : ''}
    </table>
    ` : ''}
  `;

  const subject = `[CAS Sitio] Mensaje de ${_nombre}${_empresa ? ` — ${_empresa}` : ''}`;
  const shared = { fromName: FROM_NAME, toList, bccList, subject, replyName: _nombre, replyEmail: _email, html: htmlBody };

  let sent = false;
  if (mailjetConfigured) {
    sent = await sendViaMailjet({ key: MJ_KEY, secret: MJ_SECRET, fromEmail: FROM_EMAIL_MJ, ...shared });
  }
  if (!sent && resendFallbackEnabled) {
    console.error('Mailjet falló o no está configurado, reintentando con Resend.');
    sent = await sendViaResend({ key: RESEND_KEY, fromEmail: FROM_EMAIL_RESEND, ...shared });
  }

  if (!sent) {
    return res.status(500).json({ ok: false, error: 'Error al enviar el mensaje.' });
  }

  return res.status(200).json({ ok: true });
}
