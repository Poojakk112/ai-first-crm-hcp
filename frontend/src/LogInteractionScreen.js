import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setFormField,
  resetForm,
  addChatMessage,
  setChatInput,
  setInteractions,
  setToolInput,
  setToolOutput,
  setEditTargetId,
  setEditRequest,
  setLoading,
} from "./redux/interactionSlice";

const API_BASE = "http://127.0.0.1:8000";

function LogInteractionScreen() {
  const dispatch = useDispatch();
  const {
    form,
    chatMessages,
    chatInput,
    interactions,
    toolInput,
    toolOutput,
    editTargetId,
    editRequest,
    loading,
  } = useSelector((state) => state.interaction);

  const loadInteractions = async () => {
    try {
      const res = await fetch(`${API_BASE}/interactions`);
      const data = await res.json();
      dispatch(setInteractions(data));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInteractions();
    // eslint-disable-next-line
  }, []);

  // ---------------- STRUCTURED FORM: Log Interaction tool ----------------
  const submitForm = async () => {
    dispatch(setLoading(true));
    try {
      const res = await fetch(`${API_BASE}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await res.json();
      dispatch(resetForm());
      await loadInteractions();
    } catch (err) {
      console.error(err);
    }
    dispatch(setLoading(false));
  };

  // ---------------- CHAT: Log Interaction tool via free text ----------------
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    dispatch(addChatMessage({ from: "user", text: chatInput }));
    dispatch(setLoading(true));
    try {
      const res = await fetch(`${API_BASE}/interactions/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput }),
      });
      const data = await res.json();
      dispatch(addChatMessage({ from: "ai", text: data.reply || "Logged." }));
      await loadInteractions();
    } catch (err) {
      dispatch(addChatMessage({ from: "ai", text: "Backend error." }));
    }
    dispatch(setChatInput(""));
    dispatch(setLoading(false));
  };

  // ---------------- EDIT INTERACTION tool ----------------
  const runEdit = async () => {
    if (!editTargetId || !editRequest.trim()) return;
    dispatch(setLoading(true));
    try {
      const res = await fetch(`${API_BASE}/interactions/${editTargetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit_request: editRequest }),
      });
      const data = await res.json();
      dispatch(setToolOutput(JSON.stringify(data, null, 2)));
      await loadInteractions();
    } catch (err) {
      dispatch(setToolOutput("Backend error."));
    }
    dispatch(setLoading(false));
  };

  // ---------------- EXTRACT / SUMMARY / SUGGEST (individual tools demo) ----------------
  const runTool = async (action) => {
    if (!toolInput.trim()) return;
    dispatch(setLoading(true));
    try {
      const res = await fetch(`${API_BASE}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: toolInput, action }),
      });
      const data = await res.json();
      dispatch(setToolOutput(data.output || JSON.stringify(data)));
    } catch (err) {
      dispatch(setToolOutput("Backend error."));
    }
    dispatch(setLoading(false));
  };

  const addTag = (field, value) => {
    if (!value.trim()) return;
    dispatch(setFormField({ field, value: [...form[field], value] }));
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2>Log HCP Interaction</h2>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        {/* ---------------- LEFT: STRUCTURED FORM ---------------- */}
        <div style={{ flex: "1 1 500px", border: "1px solid #ddd", borderRadius: "8px", padding: "20px" }}>
          <h3>Interaction Details</h3>

          <label>HCP Name</label>
          <input
            style={inputStyle}
            placeholder="Search or select HCP..."
            value={form.hcp_name}
            onChange={(e) => dispatch(setFormField({ field: "hcp_name", value: e.target.value }))}
          />

          <label>Interaction Type</label>
          <select
            style={inputStyle}
            value={form.interaction_type}
            onChange={(e) => dispatch(setFormField({ field: "interaction_type", value: e.target.value }))}
          >
            <option>Meeting</option>
            <option>Call</option>
            <option>Email</option>
            <option>Conference</option>
          </select>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label>Date</label>
              <input
                type="date"
                style={inputStyle}
                value={form.interaction_date}
                onChange={(e) => dispatch(setFormField({ field: "interaction_date", value: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Time</label>
              <input
                type="time"
                style={inputStyle}
                value={form.interaction_time}
                onChange={(e) => dispatch(setFormField({ field: "interaction_time", value: e.target.value }))}
              />
            </div>
          </div>

          <label>Attendees</label>
          <input
            style={inputStyle}
            placeholder="Enter names or search..."
            value={form.attendees}
            onChange={(e) => dispatch(setFormField({ field: "attendees", value: e.target.value }))}
          />

          <label>Topics Discussed</label>
          <textarea
            style={{ ...inputStyle, height: "80px" }}
            placeholder="Enter key discussion points..."
            value={form.topics_discussed}
            onChange={(e) => dispatch(setFormField({ field: "topics_discussed", value: e.target.value }))}
          />

          <label>Materials Shared</label>
          <TagInput
            items={form.materials_shared}
            onAdd={(v) => addTag("materials_shared", v)}
          />

          <label>Samples Distributed</label>
          <TagInput
            items={form.samples_distributed}
            onAdd={(v) => addTag("samples_distributed", v)}
          />

          <label>Observed/Inferred HCP Sentiment</label>
          <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
            {["Positive", "Neutral", "Negative"].map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="radio"
                  checked={form.sentiment === s}
                  onChange={() => dispatch(setFormField({ field: "sentiment", value: s }))}
                />
                {s}
              </label>
            ))}
          </div>

          <label>Outcomes</label>
          <textarea
            style={{ ...inputStyle, height: "60px" }}
            placeholder="Key outcomes or agreements..."
            value={form.outcomes}
            onChange={(e) => dispatch(setFormField({ field: "outcomes", value: e.target.value }))}
          />

          <label>Follow-up Actions</label>
          <textarea
            style={{ ...inputStyle, height: "60px" }}
            placeholder="Enter next steps or tasks..."
            value={form.follow_up_actions}
            onChange={(e) => dispatch(setFormField({ field: "follow_up_actions", value: e.target.value }))}
          />

          <button style={primaryBtn} onClick={submitForm} disabled={loading}>
            {loading ? "Saving..." : "Log Interaction"}
          </button>
        </div>

        {/* ---------------- RIGHT: AI ASSISTANT CHAT ---------------- */}
        <div style={{ flex: "1 1 320px", border: "1px solid #ddd", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column" }}>
          <h3>AI Assistant</h3>
          <p style={{ color: "#666", marginTop: "-8px" }}>Log interaction via chat</p>

          <div style={{ flex: 1, border: "1px solid #eee", borderRadius: "6px", padding: "10px", minHeight: "200px", marginBottom: "10px", overflowY: "auto" }}>
            {chatMessages.length === 0 && (
              <p style={{ color: "#888" }}>
                Log interaction details here (e.g., "Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.
              </p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ marginBottom: "8px", textAlign: m.from === "user" ? "right" : "left" }}>
                <span style={{
                  display: "inline-block",
                  background: m.from === "user" ? "#0b5fff" : "#f1f1f1",
                  color: m.from === "user" ? "#fff" : "#000",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  maxWidth: "90%",
                }}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
              placeholder="Describe interaction..."
              value={chatInput}
              onChange={(e) => dispatch(setChatInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
            />
            <button style={primaryBtn} onClick={sendChat} disabled={loading}>
              Log
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- TOOLS DEMO PANEL ---------------- */}
      <div style={{ marginTop: "30px", border: "1px solid #ddd", borderRadius: "8px", padding: "20px" }}>
        <h3>LangGraph Tools (individual demo)</h3>
        <p style={{ color: "#666" }}>Use this panel to demo each of the 5 tools separately for your video.</p>

        <label>Sample text (used by Extract / Summary / Suggest)</label>
        <textarea
          style={{ ...inputStyle, height: "60px" }}
          placeholder="e.g. Met Dr. Patel, discussed CardioMax trial data, doctor was hesitant about side effects"
          value={toolInput}
          onChange={(e) => dispatch(setToolInput(e.target.value))}
        />

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          <button style={secondaryBtn} onClick={() => runTool("extract")}>Extract Entities</button>
          <button style={secondaryBtn} onClick={() => runTool("summary")}>Summarize</button>
          <button style={secondaryBtn} onClick={() => runTool("suggest")}>Suggest Next Action</button>
        </div>

        <h4>Edit Interaction (needs a saved interaction ID from the list below)</h4>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, width: "100px" }}
            placeholder="ID"
            value={editTargetId}
            onChange={(e) => dispatch(setEditTargetId(e.target.value))}
          />
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="e.g. change sentiment to negative"
            value={editRequest}
            onChange={(e) => dispatch(setEditRequest(e.target.value))}
          />
          <button style={secondaryBtn} onClick={runEdit}>Edit Interaction</button>
        </div>

        {toolOutput && (
          <pre style={{ background: "#f5f5f5", padding: "12px", borderRadius: "6px", whiteSpace: "pre-wrap" }}>
            {toolOutput}
          </pre>
        )}
      </div>

      {/* ---------------- SAVED INTERACTIONS LIST ---------------- */}
      <div style={{ marginTop: "30px" }}>
        <h3>Saved Interactions</h3>
        {interactions.length === 0 && <p style={{ color: "#888" }}>No interactions logged yet.</p>}
        {interactions.map((item) => (
          <div key={item.id} style={{ border: "1px solid #eee", borderRadius: "6px", padding: "12px", marginBottom: "10px" }}>
            <p><b>#{item.id} — {item.hcp_name || "(chat entry)"}</b> — {item.sentiment}</p>
            <p style={{ color: "#555" }}>{item.topics_discussed}</p>
            {item.ai_summary && (
              <p style={{ color: "#0b5fff", fontStyle: "italic" }}>{item.ai_summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TagInput({ items, onAdd }) {
  const [value, setValue] = React.useState("");
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          placeholder="Type and press Add"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          style={secondaryBtn}
          onClick={() => {
            onAdd(value);
            setValue("");
          }}
        >
          Add
        </button>
      </div>
      <div style={{ marginTop: "6px" }}>
        {items.length === 0 ? (
          <span style={{ color: "#999" }}>No items added</span>
        ) : (
          items.map((it, i) => (
            <span key={i} style={{ display: "inline-block", background: "#eef", padding: "4px 8px", borderRadius: "12px", marginRight: "6px", fontSize: "13px" }}>
              {it}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px",
  marginBottom: "12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontFamily: "'Inter', sans-serif",
  boxSizing: "border-box",
};

const primaryBtn = {
  background: "#0b5fff",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

const secondaryBtn = {
  background: "#eee",
  color: "#333",
  border: "1px solid #ccc",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "'Inter', sans-serif",
};

export default LogInteractionScreen;