// netlify/functions/export-profiles.js
import { getStore } from "@netlify/blobs";

function checkAuth(event) {
  const token = event.queryStringParameters?.token || event.headers["x-admin-token"];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return false;
  }
  return true;
}

function csvEscape(value) {
  if (value == null) return "";
  const s = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // quote if contains quote, comma, or newline
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function handler(event) {
  if (!checkAuth(event)) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const format = (event.queryStringParameters?.format || "csv").toLowerCase();
  const store = getStore("profiles");

  // paginate through all keys
  const allKeys = [];
  let cursor;
  do {
    const page = await store.list({ cursor });
    for (const b of page.blobs || []) allKeys.push(b.key);
    cursor = page.cursor;
  } while (cursor);

  // load all JSON docs
  const records = [];
  for (const key of allKeys) {
    try {
      const rec = await store.getJSON(key);
      if (rec) records.push(rec);
    } catch { /* ignore bad entries */ }
  }

  if (format === "json") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="profiles.json"`
      },
      body: JSON.stringify(records, null, 2)
    };
  }

  // default: CSV
  const header = [
    "id", "receivedAt", "email", "name",
    "universities", "academics", "extracurricular", "athletics", "personal",
    "ip", "userAgent"
  ];

  const rows = [header.join(",")];
  for (const r of records) {
    const universities = (r.universities || []).join("; ");
    rows.push([
      csvEscape(r.id),
      csvEscape(r.receivedAt),
      csvEscape(r?.contact?.email),
      csvEscape(r?.contact?.name),
      csvEscape(universities),
      csvEscape(r.academics),
      csvEscape(r.extracurricular),
      csvEscape(r.athletics),
      csvEscape(r.personal),
      csvEscape(r.ip),
      csvEscape(r.userAgent),
    ].join(","));
  }

  const csv = rows.join("\r\n");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="profiles.csv"`
    },
    body: csv
  };
}
