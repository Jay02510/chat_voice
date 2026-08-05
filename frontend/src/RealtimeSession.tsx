import { useState, useEffect, useRef, useCallback } from 'react';
import VodabiReport from './report/VodabiReport';
import { useToast } from './components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  id: string;
  speaker: 'candidate' | 'ai';
  text: string;
  final: boolean;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'ended';

interface RealtimeSessionProps {
  token: string;
  sessionId: number;
  sessionToken?: string;
  language?: string;
  onEndSession: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RealtimeSession({
  token,
  sessionId,
  sessionToken,
  language = 'ko',
  onEndSession,
}: RealtimeSessionProps) {
  const { showToast } = useToast();

  // Connection state
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [candidateSpeaking, setCandidateSpeaking] = useState(false);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [showQuickSummary, setShowQuickSummary] = useState(false);

  // Call timer & mute state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs — WebRTC
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Refs — Waveform visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Refs — transcript scrolling & logging
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const pendingAiTextRef = useRef<string>('');
  const pendingCandidateTextRef = useRef<string>('');

  // ─── Waveform Visualizer ──────────────────────────────────────────────────

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    animFrameRef.current = null;
  }, []);

  const startVisualizer = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const c = canvas.getContext('2d');
        if (!c) return;
        analyser.getByteFrequencyData(data);
        c.clearRect(0, 0, canvas.width, canvas.height);
        const bw = (canvas.width / data.length) * 2;
        let x = 0;
        for (let i = 0; i < data.length; i++) {
          const bh = (data[i] / 255) * canvas.height;
          c.fillStyle = `rgb(34, ${Math.min(255, 100 + bh * 2)}, 254)`;
          c.fillRect(x, canvas.height - bh, bw - 2, bh);
          x += bw;
        }
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      console.warn('Visualizer error:', e);
    }
  }, []);

  // ─── Log transcript turn to backend ──────────────────────────────────────

  const logToBackend = useCallback(async (text: string, type: 'TRANSCRIPT_USER' | 'TRANSCRIPT_AI') => {
    if (!text.trim()) return;
    try {
      await fetch('/api/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSessionId: sessionId, message: text, type }),
      });
    } catch (e) {
      console.warn('Log failed:', e);
    }
  }, [sessionId]);

  // ─── Data Channel Event Handler ───────────────────────────────────────────

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        // Candidate started speaking (VAD detected)
        case 'input_audio_buffer.speech_started':
          setCandidateSpeaking(true);
          // Interrupt AI if it was speaking
          setAiSpeaking(false);
          break;

        // Candidate finished speaking (VAD silence)
        case 'input_audio_buffer.speech_stopped':
          setCandidateSpeaking(false);
          break;

        // Final candidate transcript (Whisper result)
        case 'conversation.item.input_audio_transcription.completed': {
          const text = msg.transcript || '';
          if (text.trim()) {
            pendingCandidateTextRef.current = text;
            setTranscript(prev => [
              ...prev,
              { id: `user-${Date.now()}`, speaker: 'candidate', text, final: true },
            ]);
            logToBackend(text, 'TRANSCRIPT_USER');
          }
          break;
        }

        // AI response text streaming (delta chunks)
        case 'response.output_audio_transcript.delta': {
          const delta = msg.delta || '';
          pendingAiTextRef.current += delta;
          setAiSpeaking(true);
          setTranscript(prev => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'ai' && !last.final) {
              return [
                ...prev.slice(0, -1),
                { ...last, text: last.text + delta },
              ];
            }
            return [
              ...prev,
              { id: `ai-${Date.now()}`, speaker: 'ai', text: delta, final: false },
            ];
          });
          break;
        }

        // AI response complete
        case 'response.output_audio_transcript.done': {
          const fullText = msg.transcript || pendingAiTextRef.current;
          setAiSpeaking(false);
          // Mark last AI line as final
          setTranscript(prev =>
            prev.map((line, i) =>
              i === prev.length - 1 && line.speaker === 'ai'
                ? { ...line, text: fullText, final: true }
                : line,
            ),
          );
          if (fullText.trim()) {
            logToBackend(fullText, 'TRANSCRIPT_AI');
          }
          pendingAiTextRef.current = '';
          break;
        }

        // AI was interrupted by candidate
        case 'response.cancelled':
          setAiSpeaking(false);
          if (pendingAiTextRef.current.trim()) {
            logToBackend(pendingAiTextRef.current + ' [interrupted]', 'TRANSCRIPT_AI');
          }
          pendingAiTextRef.current = '';
          break;

        case 'error':
          console.error('Realtime API error event:', msg.error);
          showToast(msg.error?.message || 'Realtime session error', 'error', 'AI Error');
          break;

        default:
          break;
      }
    } catch (e) {
      console.warn('Data channel parse error:', e);
    }
  }, [logToBackend, showToast]);

  // ─── Connect to OpenAI Realtime API via WebRTC ───────────────────────────

  const connect = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg(null);

    try {
      // 1. Get ephemeral token from our backend (includes system prompt)
      const sessionRes = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, sessionToken }),
      });
      if (!sessionRes.ok) {
        const errJson = await sessionRes.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to create Realtime session on backend.');
      }
      const { ephemeral_token, openai_session_id } = await sessionRes.json();
      if (!ephemeral_token) throw new Error('No ephemeral token returned from backend.');

      console.log('[Realtime] Session created:', openai_session_id);

      // 2. Get microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      startVisualizer(micStream);

      // 3. Create WebRTC PeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Wire up AI audio output
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 5. Add mic input track
      micStream.getTracks().forEach(track => pc.addTrack(track, micStream));

      // 6. Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('[Realtime] Data channel open');
        setStatus('connected');
        showToast('Voice call connected — speak naturally!', 'success', '🎤 Connected');
        setElapsedSeconds(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setElapsedSeconds(prev => prev + 1);
        }, 1000);
      };

      dc.onclose = () => {
        console.log('[Realtime] Data channel closed');
      };

      dc.onmessage = handleDataChannelMessage;

      // 7. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 8. Exchange SDP with OpenAI Realtime API (model is fixed server-side on the ephemeral session)
      const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeral_token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });
      if (!sdpRes.ok) {
        const errTxt = await sdpRes.text();
        throw new Error(`OpenAI SDP exchange failed (${sdpRes.status}): ${errTxt}`);
      }

      // 9. Set remote description (OpenAI's SDP answer)
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      console.log('[Realtime] WebRTC connected to OpenAI');
    } catch (err: any) {
      console.error('[Realtime] Connection error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Connection failed');
      showToast(err.message || 'Failed to connect to Realtime API', 'error', 'Connection Error');
    }
  }, [sessionId, sessionToken, token, handleDataChannelMessage, startVisualizer, showToast]);

  // ─── Teardown ─────────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    stopVisualizer();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    dcRef.current?.close();
    pcRef.current?.close();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
    pcRef.current = null;
    dcRef.current = null;
    micStreamRef.current = null;
    setIsMuted(false);
  }, [stopVisualizer]);

  // ─── Mute / Unmute Mic ────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!micStreamRef.current) return;
    const nextMuted = !isMuted;
    micStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  const formatElapsed = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ─── End Call & Evaluate ─────────────────────────────────────────────────

  const handleEndCall = useCallback(async () => {
    teardown();
    setStatus('ended');
    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/call-session/${sessionId}/end`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionToken }),
      });
      const data = await res.json();
      if (data?.evaluation) {
        setEvaluationResult({
          id: sessionId,
          magicToken: sessionToken || data.magicToken,
          createdAt: data.createdAt,
          endedAt: data.endedAt,
          candidate: data.candidate,
          evaluation: data.evaluation,
        });
        setShowQuickSummary(true);
      } else {
        showToast('Session ended. No evaluation generated.', 'info');
        onEndSession();
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to generate evaluation.', 'error');
      onEndSession();
    } finally {
      setIsEvaluating(false);
    }
  }, [teardown, sessionId, sessionToken, token, onEndSession, showToast]);

  // ─── Auto-scroll transcript ───────────────────────────────────────────────
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  // ─── Render — Evaluation Loading ─────────────────────────────────────────
  if (isEvaluating) {
    return (
      <div className="session-container glass-panel" style={{ textAlign: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
        <h2>Analyzing Outbound Sales Conversation...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
          Auditing transcript against VODABI Rubrics (BS001-BS002, E0001-E0004, MC001-MC005)...
        </p>
      </div>
    );
  }

  // ─── Render — Report Card ─────────────────────────────────────────────────
  if (evaluationResult) {
    const evalData = evaluationResult.evaluation;
    return (
      <div style={{ padding: '30px 15px' }}>
        <VodabiReport session={evaluationResult} language={language} onBack={onEndSession} />

        {showQuickSummary && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
          }}>
            <div style={{
              background: '#ffffff', color: '#1e293b', borderRadius: '12px', padding: '28px',
              maxWidth: '480px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {language === 'en' ? 'AI Evaluation Result' : 'AI 역량 평가 결과'}
                </h2>
                <button
                  onClick={() => setShowQuickSummary(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >✕</button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                  ✅ {language === 'en' ? 'Strengths' : '주요 강점'}
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', lineHeight: 1.7, color: '#334155' }}>
                  {(evalData?.hiringSummary || []).slice(0, 2).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                  ⚠️ {language === 'en' ? 'Needs Improvement' : '보완할 점'}
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', lineHeight: 1.7, color: '#334155' }}>
                  {(evalData?.riskAndCoaching || []).slice(0, 2).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                  📝 {language === 'en' ? 'Verdict' : '총평'}
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.7, color: '#334155' }}>
                  {evalData?.verdictSummary}
                </p>
              </div>

              <button
                className="btn"
                onClick={() => setShowQuickSummary(false)}
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
              >
                📄 {language === 'en' ? 'View Full Report' : '평가 리포트 전체 보기'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Render — Idle (Not Yet Connected) ───────────────────────────────────
  if (status === 'idle' || status === 'error') {
    return (
      <div className="session-container glass-panel" style={{ textAlign: 'center', justifyContent: 'center', padding: '60px 20px', position: 'relative' }}>
        <button
          onClick={onEndSession}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
          }}
        >
          ← {language === 'en' ? 'Back' : '뒤로 가기'}
        </button>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📞</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Ready to Start Voice Call</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', maxWidth: '480px', lineHeight: 1.6 }}>
          This is a <strong>live voice conversation</strong> with an AI customer.<br />
          Speak naturally — no button to hold. The AI will respond in real time.
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '12px 20px', marginBottom: '20px', color: '#f87171', maxWidth: '480px', fontSize: '0.85rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={onEndSession}
            style={{ padding: '14px 24px', fontSize: '0.95rem' }}
          >
            ← {language === 'en' ? 'Back' : '뒤로 가기'}
          </button>
          <button
            className="btn"
            onClick={connect}
            style={{ padding: '14px 40px', fontSize: '1rem', fontWeight: 700 }}
          >
            🎤 Start Live Voice Call
          </button>
        </div>
      </div>
    );
  }

  // ─── Render — Connecting ──────────────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <div className="session-container glass-panel" style={{ textAlign: 'center', justifyContent: 'center', padding: '60px 20px', position: 'relative' }}>
        <button
          onClick={() => { teardown(); setStatus('idle'); onEndSession(); }}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
          }}
        >
          ← {language === 'en' ? 'Cancel & Back' : '취소 및 뒤로 가기'}
        </button>
        <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }}>📡</div>
        <h2>Connecting to AI Customer...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Establishing secure voice channel</p>
      </div>
    );
  }

  // ─── Render — Live Session ────────────────────────────────────────────────
  return (
    <div className="session-container glass-panel">

      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => { teardown(); onEndSession(); }}
            style={{
              padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--glass-border)',
              borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            }}
          >
            ← {language === 'en' ? 'Back' : '뒤로 가기'}
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
              📞 Live Voice Session
              {aiSpeaking && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 400 }}>🔊 AI Speaking...</span>}
              {candidateSpeaking && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#22c55e', fontWeight: 400 }}>🎤 You're Speaking...</span>}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Session #{sessionId}</span>
            <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#22c55e' }}>● Live — Speak Naturally</span>
            <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>⏱ {formatElapsed(elapsedSeconds)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={toggleMute}
            style={{
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              background: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isMuted ? 'rgba(239,68,68,0.4)' : 'var(--glass-border)'}`,
              color: isMuted ? '#f87171' : 'var(--text-primary)',
            }}
          >
            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
          <button className="btn btn-danger" onClick={handleEndCall}>End Call & Analyze</button>
        </div>
      </div>

      {/* Live Transcript */}
      <div className="chat-messages">
        {transcript.length === 0 && (
          <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎙️</div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Voice Call Active</p>
            <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
              Speak directly — the AI will respond in real time. No button needed.
            </p>
          </div>
        )}
        {transcript.map(line => (
          <div key={line.id} className={`message ${line.speaker === 'candidate' ? 'user' : 'ai'}`}>
            <span style={{ fontSize: '0.72rem', opacity: 0.7, display: 'block', marginBottom: '3px' }}>
              {line.speaker === 'candidate' ? '🎤 You (Sales Rep)' : '🤖 AI Customer'}
              {!line.final && <span style={{ marginLeft: '6px', color: '#f59e0b' }}>●</span>}
            </span>
            {line.text}
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Voice Indicator & Waveform */}
      <div className="chat-controls" style={{ justifyContent: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.9)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>

          {/* Live Waveform Canvas */}
          <canvas
            ref={canvasRef}
            width={280}
            height={36}
            style={{
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              border: `1px solid ${candidateSpeaking ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
              transition: 'border-color 0.2s',
            }}
          />

          {/* Status Indicators */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: candidateSpeaking ? '#22c55e' : '#475569',
                boxShadow: candidateSpeaking ? '0 0 8px #22c55e' : 'none',
                transition: 'all 0.2s',
              }} />
              <span style={{ color: candidateSpeaking ? '#22c55e' : 'var(--text-secondary)' }}>
                {candidateSpeaking ? 'Speaking...' : 'Listening'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: aiSpeaking ? '#f59e0b' : '#475569',
                boxShadow: aiSpeaking ? '0 0 8px #f59e0b' : 'none',
                transition: 'all 0.2s',
              }} />
              <span style={{ color: aiSpeaking ? '#f59e0b' : 'var(--text-secondary)' }}>
                {aiSpeaking ? 'AI Responding...' : 'AI Idle'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '340px' }}>
            Speak naturally. The AI will detect when you pause and respond automatically.
            You can interrupt at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
