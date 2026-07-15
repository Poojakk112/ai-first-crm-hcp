import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  updateField,
  addMaterial,
  removeMaterial,
  addSample,
  removeSample,
  submitInteraction,
} from "../store/interactionSlice";
import { runAgentTool } from "../api/client";
import TagListField from "./TagListField";
import "./InteractionForm.css";

const INTERACTION_TYPES = ["Meeting", "Call", "Email", "Conference", "Virtual Visit"];

export default function InteractionForm() {
  const dispatch = useDispatch();
  const form = useSelector((s) => s.interactions.form);
  const status = useSelector((s) => s.interactions.status);
  const aiFollowups = useSelector((s) => s.interactions.aiSuggestedFollowups);

  const [summarizing, setSummarizing] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);

  const set = (field) => (e) =>
    dispatch(updateField({ field, value: e.target.value }));

  const handleSummarizeVoiceNote = async () => {
    if (!voiceConsent) {
      const ok = window.confirm(
        "Summarizing from a voice note requires consent to process this recording with AI. Do you consent?"
      );
      if (!ok) return;
      setVoiceConsent(true);
    }
    if (!form.topics_discussed.trim()) return;
    setSummarizing(true);
    try {
      const result = await runAgentTool(form.topics_discussed, "summary");
      dispatch(
        updateField({ field: "topics_discussed", value: result.summary || form.topics_discussed })
      );
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(submitInteraction(form));
  };

  return (
    <form className="interaction-form" onSubmit={handleSubmit}>
      <h2 className="interaction-form__title">Log HCP Interaction</h2>

      <div className="interaction-form__panel">
        <h3 className="interaction-form__section-title">Interaction Details</h3>

        <div className="interaction-form__row">
          <div className="interaction-form__field">
            <label>HCP Name</label>
            <input
              type="text"
              placeholder="Search or select HCP..."
              value={form.hcp_name}
              onChange={set("hcp_name")}
            />
          </div>
          <div className="interaction-form__field">
            <label>Interaction Type</label>
            <select value={form.interaction_type} onChange={set("interaction_type")}>
              {INTERACTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="interaction-form__row">
          <div className="interaction-form__field">
            <label>Date</label>
            <input type="date" value={form.interaction_date} onChange={set("interaction_date")} />
          </div>
          <div className="interaction-form__field">
            <label>Time</label>
            <input type="time" value={form.interaction_time} onChange={set("interaction_time")} />
          </div>
        </div>

        <div className="interaction-form__field">
          <label>Attendees</label>
          <input
            type="text"
            placeholder="Enter names or search..."
            value={form.attendees}
            onChange={set("attendees")}
          />
        </div>

        <div className="interaction-form__field">
          <label>Topics Discussed</label>
          <textarea
            rows={3}
            placeholder="Enter key discussion points..."
            value={form.topics_discussed}
            onChange={set("topics_discussed")}
          />
          <button
            type="button"
            className="interaction-form__ai-btn"
            onClick={handleSummarizeVoiceNote}
            disabled={summarizing}
          >
            ✨ {summarizing ? "Summarizing..." : "Summarize from Voice Note (Requires Consent)"}
          </button>
        </div>

        <TagListField
          label="Materials Shared"
          buttonLabel="🔍 Search/Add"
          items={form.materials_shared}
          onAdd={(v) => dispatch(addMaterial(v))}
          onRemove={(idx) => dispatch(removeMaterial(idx))}
          emptyText="No materials added."
        />

        <TagListField
          label="Samples Distributed"
          buttonLabel="＋ Add Sample"
          items={form.samples_distributed}
          onAdd={(v) => dispatch(addSample(v))}
          onRemove={(idx) => dispatch(removeSample(idx))}
          emptyText="No samples added."
        />

        <div className="interaction-form__field">
          <label>Observed/Inferred HCP Sentiment</label>
          <div className="interaction-form__sentiment">
            {["Positive", "Neutral", "Negative"].map((s) => (
              <label key={s} className="interaction-form__radio">
                <input
                  type="radio"
                  name="sentiment"
                  value={s}
                  checked={form.sentiment === s}
                  onChange={set("sentiment")}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="interaction-form__field">
          <label>Outcomes</label>
          <textarea
            rows={2}
            placeholder="Key outcomes or agreements..."
            value={form.outcomes}
            onChange={set("outcomes")}
          />
        </div>

        <div className="interaction-form__field">
          <label>Follow-up Actions</label>
          <textarea
            rows={2}
            placeholder="Enter next steps or tasks..."
            value={form.follow_up_actions}
            onChange={set("follow_up_actions")}
          />
        </div>

        {aiFollowups.length > 0 && (
          <div className="interaction-form__ai-followups">
            <span>AI Suggested Follow-ups:</span>
            <ul>
              {aiFollowups.map((f, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch(
                        updateField({
                          field: "follow_up_actions",
                          value: form.follow_up_actions
                            ? `${form.follow_up_actions}\n${f}`
                            : f,
                        })
                      )
                    }
                  >
                    + {f}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" className="interaction-form__submit" disabled={status === "loading"}>
          {status === "loading" ? "Logging..." : "Log Interaction"}
        </button>
      </div>
    </form>
  );
}
