import { useState } from "react";
import "./TagListField.css";

export default function TagListField({ label, buttonLabel, items, onAdd, onRemove, emptyText }) {
  const [draft, setDraft] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    const value = draft.trim();
    if (value) {
      onAdd(value);
      setDraft("");
      setShowInput(false);
    }
  };

  return (
    <div className="tag-list-field">
      <div className="tag-list-field__header">
        <span className="tag-list-field__label">{label}</span>
        <button
          type="button"
          className="tag-list-field__add-btn"
          onClick={() => setShowInput((s) => !s)}
        >
          {buttonLabel}
        </button>
      </div>

      {showInput && (
        <div className="tag-list-field__input-row">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={`Add ${label.toLowerCase()}...`}
            autoFocus
          />
          <button type="button" onClick={handleAdd}>Add</button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="tag-list-field__empty">{emptyText}</p>
      ) : (
        <ul className="tag-list-field__chips">
          {items.map((item, idx) => (
            <li key={idx} className="tag-list-field__chip">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onRemove(idx)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
