import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import VodabiReport from './report/VodabiReport';
import { useToast } from './components/Toast';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function LiveSession({
  token,
  sessionId,
  language = 'ko',
  onEndSession,
}: {
  token: string;
  sessionId: number;
  language?: string;
  onEndSession: () => void;
}) {
  const { showToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  // Evaluation States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // WebAudio visualizer refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
      auth: { token },
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      newSocket.emit('join-call', { sessionId });
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('error', (data: { message: string }) => {
      showToast(data.message, 'error', 'Session Error');
      setMessages((prev) => [...prev, { id: Date.now(), text: `⚠️ Error: ${data.message}`, sender: 'ai' }]);
    });

    newSocket.on('ai-response', (data: { text: string }) => {
      setMessages((prev) => [...prev, { id: Date.now(), text: data.text, sender: 'ai' }]);
    });

    newSocket.on('ai-audio-response', async (data: { text: string; audio: ArrayBuffer }) => {
      setMessages((prev) => [...prev, { id: Date.now(), text: data.text, sender: 'ai' }]);
      const blob = new Blob([data.audio], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
    });

    setSocket(newSocket);

    return () => {
      stopAudioVisualizer();
      newSocket.disconnect();
    };
  }, [sessionId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const startAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const green = Math.min(255, 100 + barHeight * 2);
          ctx.fillStyle = `rgb(34, ${green}, 254)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.error('Audio visualizer error:', e);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      stopAudioVisualizer();
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
          stopAudioVisualizer();
          if (audioChunksRef.current.length === 0) return;
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (socket) {
            setMessages((prev) => [...prev, { id: Date.now(), text: '🎤 [Voice Input]', sender: 'user' }]);
            socket.emit('audio-message', { sessionId, audio: audioBlob, language });
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(1000);
        setIsRecording(true);
        startAudioVisualizer(stream);
      } catch (err) {
        console.error('Microphone access denied:', err);
        showToast('Microphone access is required for voice evaluation test.', 'error', 'Permission Error');
      }
    }
  };

  const handleEndCall = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      stopAudioVisualizer();
    }
    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/call-session/${sessionId}/end`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data && data.evaluation) {
        setEvaluationResult({
          createdAt: data.createdAt,
          candidate: data.candidate,
          evaluation: data.evaluation,
        });
      } else {
        onEndSession();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to generate call evaluation.', 'error');
      onEndSession();
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isEvaluating) {
    return (
      <div className="session-container glass-panel" style={{ textAlign: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
        <h2>Analyzing Outbound Sales Conversation...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
          Auditing transcript performance against VODABI Rubrics (BS001-BS002, E0001-E0004, MC001-MC005)...
        </p>
      </div>
    );
  }

  if (evaluationResult) {
    return (
      <div style={{ padding: '30px 15px' }}>
        <VodabiReport
          session={evaluationResult}
          language={language}
          onBack={onEndSession}
        />
      </div>
    );
  }

  return (
    <div className="session-container glass-panel">
      <div className="chat-header">
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>🎤 Live Sales Evaluation Session</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Session ID: {sessionId}</span>
          <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: connectionStatus === 'connected' ? '#22c55e' : '#ef4444' }}>
            {connectionStatus === 'connected' ? '● Voice Connected' : '○ Offline'}
          </span>
        </div>
        <button className="btn btn-danger" onClick={handleEndCall}>End Call & Analyze</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎙️</div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Outbound Voice Call Started</p>
            <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
              This session is 100% voice-driven. Press the microphone button below to speak to the AI Sales Prospect.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block', marginBottom: '4px' }}>
              {msg.sender === 'user' ? 'Candidate (Voice)' : 'Sales AI Evaluator'}
            </span>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Control & WebAudio Visualizer Bar */}
      <div className="chat-controls" style={{ justifyContent: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.9)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          
          {/* Real-time Waveform Canvas */}
          <canvas
            ref={canvasRef}
            width={240}
            height={36}
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              border: isRecording ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
              display: isRecording ? 'block' : 'none',
            }}
          />

          <button
            className={`btn voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            style={{ width: '70px', height: '70px', borderRadius: '50%', fontSize: '1.8rem', boxShadow: isRecording ? '0 0 25px rgba(239, 68, 68, 0.8)' : '0 0 15px var(--accent-glow)' }}
            title={isRecording ? 'Stop Recording & Send Voice' : 'Tap Microphone to Speak'}
          >
            🎤
          </button>

          <span style={{ fontSize: '0.85rem', color: isRecording ? '#ef4444' : 'var(--text-secondary)', fontWeight: 500 }}>
            {isRecording ? '🔴 Recording Voice... Tap to Stop' : 'Tap Microphone to Speak'}
          </span>
        </div>
      </div>
    </div>
  );
}
