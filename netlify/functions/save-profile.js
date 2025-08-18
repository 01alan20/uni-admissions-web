import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  const email = data?.contact?.email?.trim();
  if (!email) return { statusCode: 400, body: 'Email is required.' };

  try {
    const receivedAt = new Date().toISOString();
    const safeEmail = email.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
    const key = `${receivedAt}_${safeEmail}`;

    const record = {
      ...data,
      _meta: {
        receivedAt,
        userAgent: event.headers['user-agent'] || '',
        ip: event.headers['x-nf-client-connection-ip'] || '',
      },
    };

    const store = getStore('profiles');

    // Use set() for maximum compatibility across Blobs versions
    await store.set(key, JSON.stringify(record), {
      contentType: 'application/json'
      // (intentionally omitting metadata to avoid version-specific issues)
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, id: key }),
    };
  } catch (e) {
    console.error('save-profile error:', e);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
}
