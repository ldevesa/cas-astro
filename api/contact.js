/**
 * Vercel Serverless Function — POST /api/contact
 * Recibe el formulario de contacto y lo envía via Mailjet API.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { nombre, name, empresa, company, email, telefono, phone, cargo, role, pais, country, servicio, service, mensaje, message } = req.body;

  const _nombre   = nombre?.trim()   ?? name?.trim()    ?? '';
  const _empresa  = empresa?.trim()  ?? company?.trim() ?? '';
  const _email    = email?.trim()    ?? '';
  const _telefono = telefono?.trim() ?? phone?.trim()   ?? '';
  const _cargo    = cargo?.trim()    ?? role?.trim()    ?? '';
  const _pais     = pais?.trim()     ?? country?.trim() ?? '';
  const _servicio = servicio         ?? service         ?? '';
  const _mensaje  = mensaje?.trim()  ?? message?.trim() ?? '';

  if (!_nombre || !_email || !_mensaje) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
  }

  const MJ_KEY     = process.env.MJ_APIKEY_PUBLIC;
  const MJ_SECRET  = process.env.MJ_APIKEY_PRIVATE;
  const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL ?? 'info@contenidosad.com';
  const FROM_NAME  = process.env.CONTACT_FROM_NAME  ?? 'CAS';
  const toRaw      = process.env.CONTACT_TO  ?? 'info@contenidosad.com';
  const bccRaw     = process.env.CONTACT_BCC ?? '';

  if (!MJ_KEY || !MJ_SECRET) {
    return res.status(500).json({ ok: false, error: 'Configuración de email incompleta.' });
  }

  const parseEmails = (raw) =>
    raw.split(',').map(e => e.trim()).filter(Boolean).map(e => ({ Email: e }));

  const toList  = parseEmails(toRaw);
  const bccList = parseEmails(bccRaw);

  const htmlBody = `
    <h2>Nuevo mensaje desde el sitio CAS</h2>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td><strong>Nombre:</strong></td><td>${_nombre}</td></tr>
      ${_empresa  ? `<tr><td><strong>Empresa:</strong></td><td>${_empresa}</td></tr>` : ''}
      ${_cargo    ? `<tr><td><strong>Cargo:</strong></td><td>${_cargo}</td></tr>` : ''}
      ${_pais     ? `<tr><td><strong>País:</strong></td><td>${_pais}</td></tr>` : ''}
      <tr><td><strong>Email:</strong></td><td>${_email}</td></tr>
      ${_telefono ? `<tr><td><strong>Teléfono:</strong></td><td>${_telefono}</td></tr>` : ''}
      ${_servicio ? `<tr><td><strong>Servicio:</strong></td><td>${_servicio}</td></tr>` : ''}
      <tr><td valign="top"><strong>Mensaje:</strong></td><td>${_mensaje.replace(/\n/g, '<br>')}</td></tr>
    </table>
  `;

  const messageObj = {
    From:     { Email: FROM_EMAIL, Name: FROM_NAME },
    To:       toList,
    ReplyTo:  { Email: _email, Name: _nombre },
    Subject:  `[CAS Sitio] Mensaje de ${_nombre}${_empresa ? ` — ${_empresa}` : ''}`,
    HTMLPart: htmlBody,
  };

  if (bccList.length > 0) messageObj.Bcc = bccList;

  const mjRes = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${MJ_KEY}:${MJ_SECRET}`)}`,
    },
    body: JSON.stringify({ Messages: [messageObj] }),
  });

  if (!mjRes.ok) {
    const err = await mjRes.text();
    console.error('Mailjet error:', err);
    return res.status(500).json({ ok: false, error: 'Error al enviar el mensaje.' });
  }

  return res.status(200).json({ ok: true });
}
