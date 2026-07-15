import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendChatMessage, setDraft } from "../store/chatSlice";
import { setAiSuggestedFollowups } from "../store/interactionSlice";
import "./AIAssistantChat.css";

export default function AIAssistantChat() {
  const dispatch = useDispatch();
  const { messages, draft, status } = useSelector((s) => s.chat);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || status === "loading") return;
    const action = await dispatch(sendChatMessage(text));
    const interaction = action.payload?.result?.interaction;
    if (interaction?.ai_suggested_followups) {
      dispatch(setAiSuggestedFollowups(interaction.ai_suggested_followups));
    }
  };

  return (
    <aside className="ai-chat">
      <div className="ai-chat__header">
        <span className="ai-chat__icon">🤖</span>
        <div>
          <h3>AI Assistant</h3>
          <p>Log interaction via chat</p>
        </div>
      </div>

      <div className="ai-chat__body" ref={listRef}>
        {messages.length === 0 && (
          <p className="ai-chat__placeholder">
            Log interaction details here (e.g., "Met Dr. Smith, discussed
            Product X efficacy, positive sentiment, shared brochure") or ask
            for help.
          </p>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`ai-chat__bubble ai-chat__bubble--${m.role}`}>
            {m.text}
          </div>
        ))}
        {status === "loading" && (
          <div className="ai-chat__bubble ai-chat__bubble--assistant ai-chat__bubble--loading">
            Thinking…
          </div>
        )}
      </div>

      <div className="ai-chat__input-row">
        <input
          type="text"
          placeholder="Describe interaction..."
          value={draft}
          onChange={(e) => dispatch(setDraft(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button type="button" onClick={handleSend} disabled={status === "loading"}>
          ⬆ Log
        </button>
      </div>
    </aside>
  );
}
