// netlify/functions/save-profile.js
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const data = JSON.parse(event.body || '{}');

    // Minimal validation
    if (!data?.contact?.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
    }

    // Generate an ID and record
    const id = crypto.randomUUID();
    const receivedAt = new Date().toISOString();
    const userAgent = event.headers['user-agent'] || '';
    const ip = event.headers['x-nf-client-connection-ip'] || '';

    const record = { id, receivedAt, userAgent, ip, ...data };

    // Persist to Netlify Blobs: store = "profiles", key = id
    const store = getStore('profiles');
    await store.setJSON(id, record);

    return { statusCode: 200, body: JSON.stringify({ ok: true, id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
