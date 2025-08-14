import { useEffect, useState } from "react";
import * as webllm from "@mlc-ai/web-llm";

// Small models you can switch between (edit the list as you like)
const MODELS = [
  { id: "TinyLlama-1.1B-chat-v1.0-q4f16_1-MLC", label: "TinyLlama 1.1B (q4f16_1)" },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B (q4f16_1)" },
  { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", label: "Phi-3 mini 4k (q4f16_1)" }
];

export default function AssistantWidget() {
  const [engine, setEngine] = useState(null);
  const [status, setStatus] = useState("Idle");
  const [busy, setBusy] = useState(false);
  const [modelId, setModelId] = useState(
    localStorage.getItem("assistant.modelId") || MODELS[0].id
  );
  const [system, setSystem] = useState(
    localStorage.getItem("assistant.system") ||
      "You are an admissions data assistant. Be concise and helpful."
  );
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([
    { role: "assistant", content: "Hi! Ask me about admissions concepts or metrics." }
  ]);

  // Load model when modelId changes
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        setStatus(`Loading ${modelId}… (first load can take a while)`);
        setEngine(null);
        const e = await webllm.CreateMLCEngine(modelId, {
          initProgressCallback: (p) => !canceled && setStatus(p.text || "Loading…")
        });
        if (!canceled) {
          setEngine(e);
          setStatus("Ready");
        }
      } catch (err) {
        console.error(err);
        if (!canceled) setStatus("Failed to load model");
      }
    })();
    return () => { canceled = true; };
  }, [modelId]);

  // Persist settings
  useEffect(() => { localStorage.setItem("assistant.modelId", modelId); }, [modelId]);
  useEffect(() => { localStorage.setItem("assistant.system", system); }, [system]);

  async function send() {
    if (!engine || !input.trim()) return;
    const base = [
      ...(system ? [{ role: "system", content: system }] : []),
      ...chat.filter(m => m.role !== "system"), // ensure no duplicates
      { role: "user", content: input }
    ];
    setChat([...chat, { role: "user", content: input }]);
    setInput("");
    setBusy(true);
    try {
      let full = "";
      const stream = await engine.chat.completions.create({
        messages: base,
        stream: true,
        temperature: 0.4,
        max_tokens: 256
      });
      for await (const ev of stream) {
        const delta = ev?.choices?.[0]?.delta?.content || "";
        full += delta;
        // show streaming text
        setChat([...base.filter(m => m.role !== "system"), { role: "assistant", content: full }]);
      }
    } catch (e) {
      console.error(e);
      setChat(c => [...c, { role: "assistant", content: "Sorry — something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>On-device Assistant</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#555" }}>
          Status: {status} · {navigator.gpu ? "WebGPU detected" : "WASM fallback"}
        </div>
        <label style={{ marginLeft: "auto" }}>
          Model:&nbsp;
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={busy}
          >
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>System prompt (optional):</div>
        <textarea
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          rows={2}
          style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
        />
      </div>

      <div style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 12,
        minHeight: 220,
        marginBottom: 12,
        background: "#fff"
      }}>
        {chat.map((m, i) => (
          <div key={i} style={{ margin: "8px 0" }}>
            <strong>{m.role === "user" ? "You" : "Assistant"}:</strong>{" "}
            <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., explain acceptance vs. yield"
          style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
        />
        <button onClick={send} disabled={!engine || busy} style={{ padding: "10px 16px" }}>
          {busy ? "Thinking…" : "Send"}
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
        First visit downloads model shards (cached by the browser for future loads).
      </div>
    </div>
  );
}
