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
  const TO_EMAIL  = import.meta.env.CONTACT_TO_EMAIL ?? 'info@contenidosad.com';
  const TO_NAME   = import.meta.env.CONTACT_TO_NAME  ?? 'CAS';

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

  const payload = {
    Messages: [
      {
        From: { Email: TO_EMAIL, Name: TO_NAME },
        To:   [{ Email: TO_EMAIL, Name: TO_NAME }],
        ReplyTo: { Email: email, Name: nombre },
        Subject: `[CAS Sitio] Mensaje de ${nombre}${empresa ? ` — ${empresa}` : ''}`,
        HTMLPart: htmlBody,
      },
    ],
  };

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
