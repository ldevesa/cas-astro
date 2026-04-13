/**
 * Cloudflare Pages Function — POST /api/contact
 * Recibe el formulario de contacto y lo envía via Mailjet API.
 */
export async function onRequestPost({ request, env }) {
  const data = await request.formData();

  const nombre   = data.get('nombre')?.trim()  ?? data.get('name')?.trim()    ?? '';
  const empresa  = data.get('empresa')?.trim() ?? data.get('company')?.trim() ?? '';
  const email    = data.get('email')?.trim()   ?? '';
  const servicio = data.get('servicio')        ?? data.get('service')         ?? '';
  const mensaje  = data.get('mensaje')?.trim() ?? data.get('message')?.trim() ?? '';

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
      <tr><td><strong>Nombre:</strong></td><td>${nombre}</td></tr>
      ${empresa  ? `<tr><td><strong>Empresa:</strong></td><td>${empresa}</td></tr>` : ''}
      <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
      ${servicio ? `<tr><td><strong>Servicio:</strong></td><td>${servicio}</td></tr>` : ''}
      <tr><td valign="top"><strong>Mensaje:</strong></td><td>${mensaje.replace(/\n/g, '<br>')}</td></tr>
    </table>
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
