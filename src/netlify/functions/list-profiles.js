// netlify/functions/list-profiles.js
import { getStore } from "@netlify/blobs";

function checkAuth(event) {
  const token = event.queryStringParameters?.token || event.headers["x-admin-token"];
  return token && token === process.env.ADMIN_TOKEN;
}

export async function handler(event) {
  if (!checkAuth(event)) return { statusCode: 401, body: "Unauthorized" };

  const store = getStore("profiles");
  const result = [];
  let cursor;
  do {
    const page = await store.list({ cursor });
    for (const b of page.blobs || []) {
      result.push({ key: b.key, size: b.size, uploadedAt: b.uploadedAt, etag: b.etag });
    }
    cursor = page.cursor;
  } while (cursor);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count: result.length, items: result }, null, 2)
  };
}
