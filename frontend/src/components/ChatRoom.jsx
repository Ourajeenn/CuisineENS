import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";

export default function ChatRoom({ mealId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get(`/meals/${mealId}/messages`);
        setMessages(response.data);
      } catch (error) {
        console.error("Erreur de chargement de l'historique :", error);
      }
    };
    fetchHistory();
  }, [mealId]);

  // Handle WebSocket Connection
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Dynamically build WS URL from VITE_API_URL or current location
    let wsBaseUrl = "ws://localhost:8000";
    if (import.meta.env.VITE_API_URL) {
      wsBaseUrl = import.meta.env.VITE_API_URL.replace(/^http/, "ws");
    } else if (window.location.hostname !== "localhost") {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      wsBaseUrl = `${protocol}://${window.location.host}`;
    }
    const wsUrl = `${wsBaseUrl}/ws/chat/${mealId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log("WebSocket connecté pour le repas :", mealId);
    };

    ws.onmessage = (event) => {
      const newMsg = JSON.parse(event.data);
      setMessages((prev) => [...prev, newMsg]);
    };

    ws.onclose = (event) => {
      setWsConnected(false);
      console.log("WebSocket déconnecté :", event.reason);
    };

    ws.onerror = (error) => {
      console.error("Erreur WebSocket :", error);
    };

    return () => {
      ws.close();
    };
  }, [mealId]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Send via WebSocket
    wsRef.current.send(JSON.stringify({ content: inputText }));
    setInputText("");
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  return (
    <div className="chat-container">
      <div style={{ background: "var(--primary)", color: "white", padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ color: "white", margin: 0, fontSize: "1rem" }}>
          <i className="fas fa-comments" style={{ marginRight: "8px" }}></i>
          Discussion Logistique
        </h4>
        <span style={{ fontSize: "0.75rem", background: wsConnected ? "rgba(40, 167, 69, 0.2)" : "rgba(220, 53, 69, 0.2)", color: wsConnected ? "#28a745" : "#dc3545", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
          {wsConnected ? "En direct" : "Hors ligne"}
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2rem" }}>
            Aucun message pour le moment. Dites bonjour ! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`message-bubble ${isMe ? "outgoing" : "incoming"}`}
              >
                {!isMe && <div className="message-sender">{msg.sender.name}</div>}
                <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
                <div className="message-meta">
                  <span>{msg.sender.role === 'cook' ? '🍳 Chef' : '🍽️ Convive'}</span>
                  <span>{formatTime(msg.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Écrivez votre message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!wsConnected}
        />
        <button type="submit" className="chat-send-btn" disabled={!wsConnected}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
}
