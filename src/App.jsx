import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";
const DEFAULT_MODEL = "qwen2.5-coder:7b";
const FALLBACK_MODELS = ["qwen2.5-coder:7b", "qwen3:14b"];

// Splits a message into alternating plain-text / code segments on ``` fences
function splitContent(content) {
  const parts = content.split("```");
  return parts.map((part, i) => ({
    type: i % 2 === 1 ? "code" : "text",
    text: part,
  }));
}

function MarkdownText({ text }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

function MessageBubble({ role, content }) {
  const segments = splitContent(content);
  return (
    <div className={`bubble-row ${role}`}>
      <div className={`bubble ${role}`}>
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <pre className="code-block" key={i}>
              <code>{seg.text.replace(/^[a-zA-Z]*\n/, "")}</code>
            </pre>
          ) : (
            seg.text && <MarkdownText key={i} text={seg.text} />
          )
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(OLLAMA_TAGS_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const names = data.models?.map((m) => m.name).filter(Boolean) ?? [];
        if (names.length > 0) {
          setModels(names);
          setModel((current) => (names.includes(current) ? current : names[0]));
        }
      })
      .catch(() => {
        setModels(FALLBACK_MODELS);
      });
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: history,
          stream: true,
        }),
      });

      if (!response.ok) {
  const errorText = await response.text();
  console.error("Ollama error:", errorText);
  throw new Error(`Ollama ${response.status}: ${errorText}`);
}

if (!response.body) {
  throw new Error("No response body from Ollama");
}

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line for next chunk

        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = JSON.parse(line);
          if (chunk.message?.content) {
            assistantText += chunk.message.content;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: assistantText,
              };
              return next;
            });
          }
        }
      }
    } catch (err) {
      setError(
        err.message.includes("fetch")
          ? "Can't reach Ollama at localhost:11434. Make sure it's running, and that OLLAMA_ORIGINS is set so it accepts requests from this page (see README)."
          : err.message
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="status-group">
          <span className={`status-dot ${isStreaming ? "pulse" : ""}`} />
          <select
            className="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isStreaming}
            aria-label="Select model"
          >
            {models.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="status-sub">local · 11434</span>
        </div>
        <div className="waveform" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`bar ${isStreaming ? "active" : ""}`}
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </header>

      <main className="chat-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>No messages yet.</p>
            <p className="empty-sub">Ask {model} something below to get started.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {error && <div className="error-banner">{error}</div>}
        <div ref={bottomRef} />
      </main>

      <footer className="input-bar">
        <span className="prompt-glyph">{">"}</span>
        <textarea
          ref={textareaRef}
          value={input}
          placeholder="Made by ojas_space :)"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? "..." : "Send"}
        </button>
      </footer>
    </div>
  );
}
