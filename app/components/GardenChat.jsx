"use client";

import { MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { answerFromPlan } from "../../lib/chat/plan-answers";
import { CHAT_MESSAGE_MAX_LENGTH } from "../../lib/chat/prompt";

const EXAMPLE_QUESTIONS = [
  "When should I plant the first crop?",
  "What can I grow here that needs less water?",
  "Which plant would do better in the shadier area?",
];

function newMessageId() {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Follow-up questions about the plan. Plan-specific "when / spacing / how many"
 * questions are answered locally; everything else goes to /api/garden-chat.
 */
export default function GardenChat({ plan, climate, messages, onMessagesChange, onApplySwap }) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, pending]);

  async function ask(question) {
    const text = question.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
    if (!text || pending) {
      return;
    }
    const userMessage = { id: newMessageId(), role: "user", text };
    const withQuestion = [...messages, userMessage];
    onMessagesChange(withQuestion);
    setDraft("");

    const local = answerFromPlan(text, plan);
    if (local) {
      onMessagesChange([
        ...withQuestion,
        { id: newMessageId(), role: "assistant", text: local.text, source: "plan", suggestions: [] },
      ]);
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/garden-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          climate,
          messages: withQuestion.map(({ role, text: messageText }) => ({ role, text: messageText })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      onMessagesChange([
        ...withQuestion,
        {
          id: newMessageId(),
          role: "assistant",
          text: data.reply || data.error || "Something went wrong. Please try again.",
          source: data.unavailable || data.rateLimited || !response.ok ? "notice" : "ai",
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        },
      ]);
    } catch {
      onMessagesChange([
        ...withQuestion,
        {
          id: newMessageId(),
          role: "assistant",
          text: "The garden helper could not be reached. Please check your connection and try again.",
          source: "notice",
          suggestions: [],
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function applySuggestion(messageId, suggestion) {
    onApplySwap(suggestion.plantId, suggestion.replacement);
    onMessagesChange(
      messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              suggestions: message.suggestions.map((item) =>
                item.plantId === suggestion.plantId ? { ...item, applied: true } : item,
              ),
            }
          : message,
      ),
    );
  }

  const plantIds = new Set(plan.layout.plants.map((plant) => plant.id));

  return (
    <section className="result-content-section garden-chat-section no-print" aria-labelledby="garden-chat-title">
      <div className="result-section-heading">
        <span>07</span>
        <div>
          <h2 id="garden-chat-title">Ask about my garden</h2>
          <p>Questions about timing, spacing, or quantities for your plants are answered right from your plan.</p>
        </div>
      </div>

      <div className="garden-chat-log" ref={listRef} role="log" aria-live="polite" aria-label="Garden chat messages">
        {messages.length ? (
          messages.map((message) => (
            <div className={`garden-chat-message ${message.role}`} key={message.id}>
              {message.role === "assistant" ? (
                <span className={`garden-chat-source ${message.source}`}>
                  {message.source === "plan" ? "From your plan" : message.source === "ai" ? "Garden helper" : "Notice"}
                </span>
              ) : null}
              <p>{message.text}</p>
              {message.suggestions?.length ? (
                <div className="garden-chat-suggestions">
                  {message.suggestions.map((suggestion) => {
                    // A suggestion goes stale once its plant group is swapped or removed.
                    const available = !suggestion.applied && plantIds.has(suggestion.plantId);
                    return (
                      <button
                        type="button"
                        key={`${message.id}-${suggestion.plantId}`}
                        disabled={!available}
                        onClick={() => applySuggestion(message.id, suggestion)}
                        title={suggestion.reason}
                      >
                        {suggestion.applied
                          ? `Swapped ${suggestion.from} → ${suggestion.replacement}`
                          : `Swap ${suggestion.from} → ${suggestion.replacement}`}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="garden-chat-empty">
            <MessageCircle size={20} aria-hidden="true" />
            <div>
              <p>Try asking:</p>
              <div className="garden-chat-examples">
                {EXAMPLE_QUESTIONS.map((example) => (
                  <button type="button" key={example} onClick={() => ask(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {pending ? <p className="garden-chat-pending">Thinking…</p> : null}
      </div>

      <form
        className="garden-chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <label htmlFor="garden-chat-input" className="visually-hidden">
          Ask a question about your garden
        </label>
        <input
          id="garden-chat-input"
          type="text"
          value={draft}
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. How far apart should I plant the basil?"
          disabled={pending}
        />
        <span className="garden-chat-count" aria-hidden="true">
          {draft.length}/{CHAT_MESSAGE_MAX_LENGTH}
        </span>
        <button type="submit" className="btn" disabled={pending || !draft.trim()}>
          <Send size={16} aria-hidden="true" />
          Ask
        </button>
      </form>
    </section>
  );
}
