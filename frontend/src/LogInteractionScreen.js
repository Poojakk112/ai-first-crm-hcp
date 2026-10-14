import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setFormField,
  resetForm,
  addChatMessage,
  setChatInput,
  setInteractions,
  setToolInput,
  setToolOutput,
  setLoading,
} from "./redux/interactionSlice";
import "./LogInteractionScreen.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

const TYPES = [
  { value: "Meeting", icon: "🤝" },
  { value: "Call", icon: "📞" },
  { value: "Email", icon: "✉️" },
  { value: "Conference", icon: "🎤" },
];

const SENTIMENTS = [
  { value: "Positive", icon: "😊" },
  { value: "Neutral", icon: "😐" },
  { value: "Negative", icon: "😟" },
];

const CHAT_EXAMPLES = [
  "Met Dr. Sharma, discussed CardioMax efficacy, very positive, shared brochure",
  "Called Dr. Mehta about GlucoFine, worried about side effects",
  "Emailed Dr. Rao the Phase III study, neutral response",
];

const TOOLS = [
  { key: "extract", label: "Extract Entities", icon: "🧬", hint: "Pulls out doctor, products, conditions and materials" },
  { key: "summary", label: "Summarize", icon: "📝", hint: "Writes a 1–2 line CRM summary" },
  { key: "suggest", label: "Next Actions", icon: "🎯", hint: "Suggests 3 follow-up steps for the rep" },
];

function LogInteractionScreen() {
  const dispatch = useDispatch();
  const { form, chatMessages, chatInput, interactions, toolInput, toolOutput, loading } =
    useSelector((state) => state.interaction);

  const [backendUp, setBackendUp] = useState(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [toolBusy, setToolBusy] = useState("");
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [editing, setEditing] = useState({ id: null, text: "", busy: false });
  const [toasts, setToasts] = useState([]);
  const chatEndRef = useRef(null);

  // ---------------- helpers ----------------
  const toast = (text, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const loadInteractions = async () => {
    try {
      const res = await fetch(`${API_BASE}/interactions`);
      dispatch(setInteractions(await res.json()));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/`)
      .then((r) => setBackendUp(r.ok))
      .catch(() => setBackendUp(false));
    loadInteractions();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // scroll only the chat box, not the whole page
    const box = chatEndRef.current?.parentElement;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatBusy]);

  const setField = (field) => (e) => dispatch(setFormField({ field, value: e.target.value }));

  // ---------------- stats ----------------
  const stats = useMemo(() => {
    const total = interactions.length;
    const positive = interactions.filter((i) => i.sentiment === "Positive").length;
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const thisWeek = interactions.filter((i) => i.created_at && new Date(i.created_at).getTime() > weekAgo).length;
    const followUps = interactions.reduce((n, i) => n + (i.ai_suggested_followups?.length || 0), 0);
    return {
      total,
      positivePct: total ? Math.round((positive / total) * 100) : 0,
      thisWeek,
      followUps,
      split: SENTIMENTS.map((s) => ({
        ...s,
        count: interactions.filter((i) => i.sentiment === s.value).length,
      })),
    };
  }, [interactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return interactions.filter((i) => {
      if (sentimentFilter !== "All" && i.sentiment !== sentimentFilter) return false;
      if (!q) return true;
      return [i.hcp_name, i.topics_discussed, i.ai_summary, i.interaction_type]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [interactions, search, sentimentFilter]);

  // ---------------- form submit ----------------
  const submitForm = async () => {
    if (!form.hcp_name.trim()) {
      toast("Please enter the HCP name", "error");
      return;
    }
    dispatch(setLoading(true));
    try {
      const res = await fetch(`${API_BASE}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      dispatch(resetForm());
      await loadInteractions();
      toast("Interaction logged and enriched by AI ✨");
    } catch (err) {
      toast("Could not save, is the backend running?", "error");
    }
    dispatch(setLoading(false));
  };

  // ---------------- chat ----------------
  const sendChat = async (text) => {
    const message = (text ?? chatInput).trim();
    if (!message || chatBusy) return;
    dispatch(addChatMessage({ from: "user", text: message }));
    dispatch(setChatInput(""));
    setChatBusy(true);
    try {
      const res = await fetch(`${API_BASE}/interactions/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      const it = data.interaction || {};
      dispatch(
        addChatMessage({
          from: "ai",
          text: data.reply || "Logged.",
          card: it.id
            ? { hcp: it.hcp_name, type: it.interaction_type, sentiment: it.sentiment, id: it.id }
            : null,
        })
      );
      await loadInteractions();
      toast("Logged from chat ✨");
    } catch (err) {
      dispatch(addChatMessage({ from: "ai", text: "⚠️ I couldn't reach the backend. Is it running on port 8000?" }));
    }
    setChatBusy(false);
  };

  // ---------------- AI edit ----------------
  const runEdit = async (id) => {
    if (!editing.text.trim()) return;
    setEditing((e) => ({ ...e, busy: true }));
    try {
      await fetch(`${API_BASE}/interactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit_request: editing.text }),
      });
      await loadInteractions();
      toast(`Interaction #${id} updated by AI`);
      setEditing({ id: null, text: "", busy: false });
    } catch (err) {
      toast("Edit failed", "error");
      setEditing((e) => ({ ...e, busy: false }));
    }
  };

  const removeInteraction = async (id) => {
    if (!window.confirm(`Delete interaction #${id}?`)) return;
    await fetch(`${API_BASE}/interactions/${id}`, { method: "DELETE" });
    await loadInteractions();
    toast(`Interaction #${id} deleted`);
  };

  // ---------------- individual tools ----------------
  const runTool = async (action) => {
    if (!toolInput.trim()) {
      toast("Type a sample note first", "error");
      return;
    }
    setToolBusy(action);
    try {
      const res = await fetch(`${API_BASE}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: toolInput, action }),
      });
      const data = await res.json();
      dispatch(setToolOutput(JSON.stringify({ action, ...data })));
    } catch (err) {
      dispatch(setToolOutput(JSON.stringify({ action, error: true })));
    }
    setToolBusy("");
  };

  const toolResult = useMemo(() => {
    try {
      return toolOutput ? JSON.parse(toolOutput) : null;
    } catch {
      return { action: "text", output: toolOutput };
    }
  }, [toolOutput]);

  // ---------------- render ----------------
  return (
    <div className="crm">
      {/* ---------- TOP BAR ---------- */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">⚕</div>
          <div>
            <div className="brand-name">AI-First CRM</div>
            <div className="brand-sub">AI-first HCP interaction module</div>
          </div>
        </div>
        <div className={`status ${backendUp ? "up" : backendUp === false ? "down" : ""}`}>
          <span className="dot" />
          {backendUp === null ? "Connecting…" : backendUp ? "AI backend online" : "Backend offline"}
        </div>
      </header>

      <main className="container">
        {/* ---------- STATS ---------- */}
        <section className="stats">
          <StatCard label="Total interactions" value={stats.total} icon="📋" tone="indigo" />
          <StatCard label="Positive sentiment" value={`${stats.positivePct}%`} icon="💚" tone="green" />
          <StatCard label="Logged this week" value={stats.thisWeek} icon="📅" tone="amber" />
          <StatCard label="AI follow-ups suggested" value={stats.followUps} icon="🎯" tone="pink" />
        </section>

        {stats.total > 0 && (
          <div className="sentiment-bar card">
            <span className="muted small">Sentiment mix</span>
            <div className="bar">
              {stats.split.map((s) =>
                s.count ? (
                  <div
                    key={s.value}
                    className={`bar-seg ${s.value.toLowerCase()}`}
                    style={{ flex: s.count }}
                    title={`${s.value}: ${s.count}`}
                  >
                    {s.icon} {s.count}
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* ---------- FORM + CHAT ---------- */}
        <section className="grid-2">
          <div className="card">
            <div className="card-head">
              <h2>📝 Log Interaction</h2>
              <span className="pill">Structured form</span>
            </div>

            <label className="lbl">HCP name *</label>
            <input className="inp" placeholder="e.g. Dr. Priya Sharma" value={form.hcp_name} onChange={setField("hcp_name")} />

            <label className="lbl">Interaction type</label>
            <div className="seg">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`seg-btn ${form.interaction_type === t.value ? "active" : ""}`}
                  onClick={() => dispatch(setFormField({ field: "interaction_type", value: t.value }))}
                >
                  {t.icon} {t.value}
                </button>
              ))}
            </div>

            <div className="row">
              <div>
                <label className="lbl">Date</label>
                <input type="date" className="inp" value={form.interaction_date} onChange={setField("interaction_date")} />
              </div>
              <div>
                <label className="lbl">Time</label>
                <input type="time" className="inp" value={form.interaction_time} onChange={setField("interaction_time")} />
              </div>
            </div>

            <label className="lbl">Attendees</label>
            <input className="inp" placeholder="e.g. Nurse Anita, KAM Rahul" value={form.attendees} onChange={setField("attendees")} />

            <label className="lbl">Topics discussed</label>
            <textarea className="inp" rows={3} placeholder="Key discussion points…" value={form.topics_discussed} onChange={setField("topics_discussed")} />

            <div className="row">
              <div>
                <label className="lbl">Materials shared</label>
                <TagInput
                  items={form.materials_shared}
                  placeholder="Brochure, study…"
                  onChange={(v) => dispatch(setFormField({ field: "materials_shared", value: v }))}
                />
              </div>
              <div>
                <label className="lbl">Samples distributed</label>
                <TagInput
                  items={form.samples_distributed}
                  placeholder="Product × qty"
                  onChange={(v) => dispatch(setFormField({ field: "samples_distributed", value: v }))}
                />
              </div>
            </div>

            <label className="lbl">HCP sentiment</label>
            <div className="seg">
              {SENTIMENTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`seg-btn sent-${s.value.toLowerCase()} ${form.sentiment === s.value ? "active" : ""}`}
                  onClick={() => dispatch(setFormField({ field: "sentiment", value: s.value }))}
                >
                  {s.icon} {s.value}
                </button>
              ))}
            </div>

            <div className="row">
              <div>
                <label className="lbl">Outcomes</label>
                <textarea className="inp" rows={2} placeholder="Agreements, decisions…" value={form.outcomes} onChange={setField("outcomes")} />
              </div>
              <div>
                <label className="lbl">Follow-up actions</label>
                <textarea className="inp" rows={2} placeholder="Next steps…" value={form.follow_up_actions} onChange={setField("follow_up_actions")} />
              </div>
            </div>

            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => dispatch(resetForm())}>Clear</button>
              <button className="btn primary" type="button" onClick={submitForm} disabled={loading}>
                {loading ? <><Spinner /> AI is enriching…</> : "✨ Log Interaction"}
              </button>
            </div>
          </div>

          <div className="card chat">
            <div className="card-head">
              <h2>🤖 AI Assistant</h2>
              <span className="pill violet">LangGraph · Groq</span>
            </div>
            <p className="muted small">Describe a visit in plain English. The AI extracts the doctor, type and sentiment, then logs it for you.</p>

            <div className="chat-body">
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <p>Try one of these:</p>
                  {CHAT_EXAMPLES.map((ex) => (
                    <button key={ex} className="chip" type="button" onClick={() => sendChat(ex)}>
                      {ex}
                    </button>
                  ))}
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`msg ${m.from}`}>
                  {m.from === "ai" && <div className="avatar">AI</div>}
                  <div className="bubble">
                    <div className="pre">{m.text}</div>
                    {m.card && (
                      <div className="msg-card">
                        <span>#{m.card.id}</span>
                        <b>{m.card.hcp || "Unknown HCP"}</b>
                        <span>{m.card.type}</span>
                        <SentimentBadge value={m.card.sentiment} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatBusy && (
                <div className="msg ai">
                  <div className="avatar">AI</div>
                  <div className="bubble typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input">
              <input
                className="inp"
                placeholder="e.g. Met Dr. Rao, discussed…"
                value={chatInput}
                onChange={(e) => dispatch(setChatInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
              />
              <button className="btn primary" type="button" onClick={() => sendChat()} disabled={chatBusy}>
                Send
              </button>
            </div>
          </div>
        </section>

        {/* ---------- AI TOOLS ---------- */}
        <section className="card">
          <div className="card-head">
            <h2>🧠 AI Tools Playground</h2>
            <span className="pill">Run each LangGraph tool on its own</span>
          </div>
          <textarea
            className="inp"
            rows={2}
            placeholder="e.g. Met Dr. Patel, discussed CardioMax trial data, doctor was hesitant about side effects"
            value={toolInput}
            onChange={(e) => dispatch(setToolInput(e.target.value))}
          />
          <div className="tools">
            {TOOLS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`tool ${toolResult?.action === t.key ? "active" : ""}`}
                onClick={() => runTool(t.key)}
                disabled={!!toolBusy}
              >
                <span className="tool-icon">{toolBusy === t.key ? <Spinner dark /> : t.icon}</span>
                <span>
                  <b>{t.label}</b>
                  <small>{t.hint}</small>
                </span>
              </button>
            ))}
          </div>
          {toolResult && <ToolResult result={toolResult} />}
        </section>

        {/* ---------- TIMELINE ---------- */}
        <section className="card">
          <div className="card-head wrap">
            <h2>🗂️ Interaction Timeline</h2>
            <div className="filters">
              <input className="inp search" placeholder="🔍 Search HCP, topic…" value={search} onChange={(e) => setSearch(e.target.value)} />
              {["All", "Positive", "Neutral", "Negative"].map((s) => (
                <button key={s} type="button" className={`chip ${sentimentFilter === s ? "on" : ""}`} onClick={() => setSentimentFilter(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">🗒️</div>
              <p>{interactions.length ? "No interactions match your filters." : "No interactions yet. Log your first one above!"}</p>
            </div>
          )}

          <div className="timeline">
            {filtered.map((item) => {
              const type = TYPES.find((t) => t.value === item.interaction_type);
              const ent = item.extracted_entities || {};
              return (
                <article key={item.id} className="item">
                  <div className="item-icon">{type?.icon || "🗒️"}</div>
                  <div className="item-main">
                    <div className="item-top">
                      <div>
                        <b className="item-title">{item.hcp_name || "Unknown HCP"}</b>
                        <span className="muted small">
                          {" "}· {item.interaction_type || "Interaction"} · {formatDate(item)} · #{item.id}
                        </span>
                      </div>
                      <div className="item-badges">
                        <span className={`src ${item.source}`}>{item.source === "chat" ? "💬 Chat" : "📝 Form"}</span>
                        <SentimentBadge value={item.sentiment} />
                      </div>
                    </div>

                    {item.ai_summary && (
                      <div className="summary">
                        <span className="ai-tag">AI summary</span> {item.ai_summary}
                      </div>
                    )}
                    {!item.ai_summary && item.topics_discussed && <p className="muted">{item.topics_discussed}</p>}

                    <div className="tags">
                      {(ent.products || []).map((p) => <span key={`p-${p}`} className="tag prod">💊 {p}</span>)}
                      {(ent.conditions || []).map((c) => <span key={`c-${c}`} className="tag cond">🩺 {c}</span>)}
                      {(item.materials_shared || []).map((m) => <span key={`m-${m}`} className="tag mat">📄 {m}</span>)}
                      {(item.samples_distributed || []).map((s) => <span key={`s-${s}`} className="tag samp">🎁 {s}</span>)}
                    </div>

                    {item.ai_suggested_followups?.length > 0 && (
                      <div className="next">
                        <span className="next-title">🎯 Suggested next steps</span>
                        <ul>
                          {item.ai_suggested_followups.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    )}

                    {editing.id === item.id ? (
                      <div className="edit-row">
                        <input
                          className="inp"
                          autoFocus
                          placeholder='e.g. "change sentiment to negative"'
                          value={editing.text}
                          onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                          onKeyDown={(e) => e.key === "Enter" && runEdit(item.id)}
                        />
                        <button className="btn primary sm" type="button" onClick={() => runEdit(item.id)} disabled={editing.busy}>
                          {editing.busy ? <Spinner /> : "Apply"}
                        </button>
                        <button className="btn ghost sm" type="button" onClick={() => setEditing({ id: null, text: "", busy: false })}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="item-actions">
                        <button className="link" type="button" onClick={() => setEditing({ id: item.id, text: "", busy: false })}>✏️ Edit with AI</button>
                        <button className="link danger" type="button" onClick={() => removeInteraction(item.id)}>🗑 Delete</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* ---------- TOASTS ---------- */}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}

// ---------------- small components ----------------
function StatCard({ label, value, icon, tone }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function SentimentBadge({ value }) {
  const s = SENTIMENTS.find((x) => x.value === value) || SENTIMENTS[1];
  return <span className={`badge ${s.value.toLowerCase()}`}>{s.icon} {s.value}</span>;
}

function Spinner({ dark }) {
  return <span className={`spinner ${dark ? "dark" : ""}`} />;
}

function TagInput({ items, onChange, placeholder }) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setValue("");
  };
  return (
    <div className="taginput">
      {items.map((it) => (
        <span key={it} className="tag mat">
          {it}
          <button type="button" onClick={() => onChange(items.filter((x) => x !== it))}>×</button>
        </span>
      ))}
      <input
        value={value}
        placeholder={items.length ? "" : placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}

function ToolResult({ result }) {
  if (result.error) return <div className="result error">⚠️ Backend error. Is the server running?</div>;
  if (result.action === "extract" && result.entities && Object.keys(result.entities).length) {
    return (
      <div className="result">
        <div className="result-grid">
          {Object.entries(result.entities).map(([k, v]) => (
            <div key={k} className="kv">
              <span className="k">{k.replace(/_/g, " ")}</span>
              <span className="v">{Array.isArray(v) ? (v.length ? v.join(", ") : "—") : v || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (result.action === "suggest" && result.suggestions?.length) {
    return (
      <div className="result">
        <ol className="steps">
          {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
    );
  }
  return <div className="result pre">{result.summary || result.output}</div>;
}

function formatDate(item) {
  if (item.interaction_date) {
    const d = new Date(`${item.interaction_date}T${item.interaction_time || "00:00"}`);
    if (!isNaN(d)) {
      return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) +
        (item.interaction_time ? `, ${item.interaction_time}` : "");
    }
    return item.interaction_date;
  }
  if (item.created_at) {
    return new Date(item.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  return "";
}

export default LogInteractionScreen;
