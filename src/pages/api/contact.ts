export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.formData();

  const nombre  = data.get('nombre')?.toString().trim()  ?? data.get('name')?.toString().trim()    ?? '';
  const empresa = data.get('empresa')?.toString().trim() ?? data.get('company')?.toString().trim()  ?? '';
  const email   = data.get('email')?.toString().trim()   ?? '';
  const servicio = data.get('servicio')?.toString()      ?? data.get('service')?.toString()         ?? '';
  const mensaje  = data.get('mensaje')?.toString().trim() ?? data.get('message')?.toString().trim() ?? '';

  if (!nombre || !email || !mensaje) {
    return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const MJ_KEY    = import.meta.env.MJ_APIKEY_PUBLIC;
  const MJ_SECRET = import.meta.env.MJ_APIKEY_PRIVATE;
  const FROM_EMAIL = import.meta.env.CONTACT_FROM_EMAIL ?? 'info@contenidosad.com';
  const FROM_NAME  = import.meta.env.CONTACT_FROM_NAME  ?? 'CAS';

  // Destinatarios principales — separados por coma en la variable de entorno
  const toRaw  = import.meta.env.CONTACT_TO ?? 'info@contenidosad.com';
  const bccRaw = import.meta.env.CONTACT_BCC ?? '';

  const parseEmails = (raw: string) =>
    raw.split(',').map(e => e.trim()).filter(Boolean).map(e => ({ Email: e }));

  const toList  = parseEmails(toRaw);
  const bccList = parseEmails(bccRaw);

  if (!MJ_KEY || !MJ_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'Configuración de email incompleta.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const htmlBody = `
    <h2>Nuevo mensaje desde el sitio CAS</h2>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td><strong>Nombre:</strong></td><td>${nombre}</td></tr>
      ${empresa ? `<tr><td><strong>Empresa:</strong></td><td>${empresa}</td></tr>` : ''}
      <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
      ${servicio ? `<tr><td><strong>Servicio:</strong></td><td>${servicio}</td></tr>` : ''}
      <tr><td valign="top"><strong>Mensaje:</strong></td><td>${mensaje.replace(/\n/g, '<br>')}</td></tr>
    </table>
  `;

  const message: Record<string, unknown> = {
    From:    { Email: FROM_EMAIL, Name: FROM_NAME },
    To:      toList,
    ReplyTo: { Email: email, Name: nombre },
    Subject: `[CAS Sitio] Mensaje de ${nombre}${empresa ? ` — ${empresa}` : ''}`,
    HTMLPart: htmlBody,
  };

  if (bccList.length > 0) message.Bcc = bccList;

  const payload = { Messages: [message] };

  const mjRes = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${MJ_KEY}:${MJ_SECRET}`)}`,
    },
    body: JSON.stringify(payload),
  });

  if (!mjRes.ok) {
    const err = await mjRes.text();
    console.error('Mailjet error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Error al enviar el mensaje.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
