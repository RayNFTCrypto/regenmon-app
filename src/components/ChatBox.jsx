import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { PERSONALITIES, FALLBACK_PHRASES } from "../data/personalities";
import { getCurrentMood } from "../data/moods";

// Obtener token de sesión de Supabase
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Audio player para ElevenLabs TTS
let currentAudio = null;

async function speak(text, typeKey) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    const token = await getAuthToken();
    if (!token) return;

    const res = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ text, typeKey }),
    });

    if (!res.ok) throw new Error("TTS error");

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);
    currentAudio.play();
    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };
  } catch {
    // Fallback silencioso si ElevenLabs falla
  }
}

function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function ChatBox({ regenmon, regenmonId, typeKey, type, careStats }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const greetedRef = useRef(false);
  const chatSessionIdRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cargar chat de Supabase o mostrar saludo
  useEffect(() => {
    if (isOpen && !greetedRef.current && regenmonId) {
      loadChat();
    }
  }, [isOpen, regenmonId]);

  async function loadChat() {
    greetedRef.current = true;

    if (regenmonId) {
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("regenmon_id", regenmonId)
        .maybeSingle();

      if (data && data.messages.length > 0) {
        setMessages(data.messages);
        chatSessionIdRef.current = data.id;
        return;
      }
    }

    // No hay chat previo — mostrar saludo
    const personality = PERSONALITIES[typeKey];
    const initialMessages = personality
      ? [{ role: "assistant", content: personality.greeting }]
      : [];
    setMessages(initialMessages);

    // Crear sesión en Supabase
    if (regenmonId) {
      const { data: newSession } = await supabase
        .from("chat_sessions")
        .insert({ regenmon_id: regenmonId, messages: initialMessages })
        .select()
        .single();
      if (newSession) chatSessionIdRef.current = newSession.id;
    }
  }

  async function saveChat(updatedMessages) {
    if (!chatSessionIdRef.current) return;
    await supabase
      .from("chat_sessions")
      .update({ messages: updatedMessages })
      .eq("id", chatSessionIdRef.current);
  }

  const getFallbackPhrase = () => {
    const mood = getCurrentMood(careStats);
    const phrases = FALLBACK_PHRASES[mood.id] || FALLBACK_PHRASES.tranquilo;
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No auth");

      const contextMessages = newMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ regenmonId, messages: contextMessages }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.content };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveChat(updated);
      if (voiceEnabled) speak(data.content, typeKey);
    } catch {
      const fallbackMsg = { role: "assistant", content: getFallbackPhrase() };
      const updated = [...newMessages, fallbackMsg];
      setMessages(updated);
      saveChat(updated);
      if (voiceEnabled) speak(fallbackMsg.content, typeKey);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-section">
      <div className="chat-toggle-row">
        <button
          className="chat-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ "--type-color": type.color }}
        >
          <span className="chat-toggle-icon">{isOpen ? "✕" : "💬"}</span>
          <span>{isOpen ? "Cerrar chat" : `Hablar con ${regenmon.name}`}</span>
        </button>
        <button
          className="voice-toggle"
          onClick={() => {
            setVoiceEnabled(!voiceEnabled);
            if (voiceEnabled) stopSpeaking();
          }}
          style={{ "--type-color": type.color }}
          title={voiceEnabled ? "Desactivar voz" : "Activar voz"}
        >
          {voiceEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {isOpen && (
        <div className="chat-box fade-in">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.role === "assistant" && (
                  <span
                    className="chat-avatar"
                    style={{ borderColor: type.color }}
                  >
                    {type.emoji}
                  </span>
                )}
                <div
                  className={`chat-bubble ${msg.role}`}
                  style={
                    msg.role === "assistant"
                      ? { borderColor: type.color + "30" }
                      : {}
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg assistant">
                <span
                  className="chat-avatar"
                  style={{ borderColor: type.color }}
                >
                  {type.emoji}
                </span>
                <div className="chat-bubble assistant typing">
                  <span className="dot" style={{ background: type.color }} />
                  <span className="dot" style={{ background: type.color }} />
                  <span className="dot" style={{ background: type.color }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder={`Habla con ${regenmon.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
              disabled={loading}
            />
            <button
              className="chat-send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{ "--type-color": type.color }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
