// netlify/functions/save-profile.js
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const email = payload?.contact?.email?.trim();
  if (!email) return new Response("Email is required.", { status: 400 });

  try {
    const receivedAt = new Date().toISOString();
    const store = getStore("profile-reviews"); // store name as a STRING
    const safeEmail = email.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
    const key = `${receivedAt}_${safeEmail}`;

    await store.setJSON(key, {
      ...payload,
      _meta: {
        receivedAt,
        userAgent: req.headers.get("user-agent") || null,
        ip: req.headers.get("x-nf-client-connection-ip") || null,
      },
    }, { metadata: { email } });

    return Response.json({ ok: true, id: key });
  } catch (err) {
    console.error("save-profile error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
