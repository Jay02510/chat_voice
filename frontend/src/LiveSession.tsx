import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function LiveSession({ token, sessionId, onEndSession }: { token: string, sessionId: number, onEndSession: () => void }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    // We proxy /api to 3000, but socket.io needs direct host if not configured in proxy
    const newSocket = io(window.location.origin, {
      path: '/socket.io'
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      newSocket.emit('join-call', { sessionId });
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('error', (data: { message: string }) => {
      setMessages(prev => [...prev, { id: Date.now(), text: `⚠️ Error: ${data.message}`, sender: 'ai' }]);
    });

    newSocket.on('ai-response', (data: { text: string }) => {
      setMessages(prev => [...prev, { id: Date.now(), text: data.text, sender: 'ai' }]);
    });

    newSocket.on('ai-audio-response', async (data: { text: string, audio: ArrayBuffer }) => {
      setMessages(prev => [...prev, { id: Date.now(), text: data.text, sender: 'ai' }]);
      // Play audio
      const blob = new Blob([data.audio], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    setMessages(prev => [...prev, { id: Date.now(), text: inputText, sender: 'user' }]);
    socket.emit('message', { sessionId, text: inputText });
    setInputText('');
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length === 0) return;
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (socket) {
            setMessages(prev => [...prev, { id: Date.now(), text: '🎤 [Voice Message]', sender: 'user' }]);
            socket.emit('audio-message', { sessionId, audio: audioBlob });
          }
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start(1000); // Send chunks every 1 second
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Microphone access is required for voice chat.");
      }
    }
  };

  const handleEnd = async () => {
    try {
      await fetch(`/api/call-session/${sessionId}/end`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onEndSession();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="session-container glass-panel">
      <div className="chat-header">
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Live Session</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {sessionId}</span>
          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: connectionStatus === 'connected' ? 'green' : 'red' }}>
            {connectionStatus === 'connected' ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
        <button className="btn btn-danger" onClick={handleEnd}>End Call</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <p>Session started.</p>
            <p style={{ fontSize: '0.9rem' }}>Say hello or type a message!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-controls">
        <button 
          className={`btn voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          title={isRecording ? "Stop Recording" : "Hold to Speak"}
        >
          🎤
        </button>
        <form onSubmit={handleSendText} style={{ flex: 1, display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="input-field"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn">Send</button>
        </form>
      </div>
    </div>
  );
}
