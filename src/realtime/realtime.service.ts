import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';

// gpt-realtime-mini is ~3x cheaper ($10/$20 per 1M audio tokens vs $32/$64 for gpt-realtime)
// and does all the heavy analytical work (scoring) on gpt-4o separately, not on this model —
// worth A/B testing voice quality before assuming the full model is needed.
// Override via REALTIME_MODEL env var to switch back to 'gpt-realtime' for comparison.
const REALTIME_MODEL = process.env.REALTIME_MODEL || 'gpt-realtime-mini';

// Realtime voice options: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar.
// Scenarios can override this per AI-customer persona (Persona.voice); this is the fallback.
const DEFAULT_VOICE = process.env.REALTIME_VOICE || 'marin';

const AVAILABLE_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
const VOICE_PREVIEW_TEXT = '안녕하세요, 고객센터 상담사입니다. 무엇을 도와드릴까요?';

// OpenAI's own JS SDK retries transient failures by default (used in evaluation.service.ts);
// these are raw fetch() calls, so they don't get that for free. Retries only on network
// errors and 5xx/429 (server-side/rate-limit — worth retrying), never on 4xx (bad request/
// auth — retrying won't help and just burns time on a call that will fail again identically).
async function callOpenAI(path: string, body: unknown, errorLabel: string): Promise<Response> {
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`https://api.openai.com/v1/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`${errorLabel} failed (${response.status}): ${await response.text()}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

@Injectable()
export class RealtimeService {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async createSession(sessionId?: number) {
    // Build the full persona + scenario + tier system prompt from the DB
    const systemPrompt = await this.chatService.getSessionSystemPrompt(sessionId);

    let voice = DEFAULT_VOICE;
    if (sessionId) {
      const session = await this.prisma.callSession.findUnique({
        where: { id: sessionId },
        include: { persona: true },
      });
      if (session?.persona?.voice) {
        voice = session.persona.voice;
      }
    }

    const body = {
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        instructions: systemPrompt,
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: {
              model: 'gpt-4o-transcribe',
              language: 'ko', // without a hint, short/ambiguous audio segments frequently auto-detect as English
            },
            noise_reduction: {
              type: 'near_field',       // Suppress room/background noise while the mic is held open
            },
            // Push-to-talk: client explicitly commits the buffer and requests a response
            // when the candidate releases the talk button — no server-side VAD auto-trigger.
            // Removes false-trigger AI responses (each one burns real output-audio tokens)
            // and gives the candidate an unambiguous "the AI is listening now" signal.
            turn_detection: null,
          },
          output: {
            voice,
          },
        },
      },
    };

    let response: Response;
    try {
      response = await callOpenAI('realtime/client_secrets', body, 'OpenAI Realtime API session creation');
    } catch (err) {
      console.error('OpenAI Realtime session error:', err);
      throw new InternalServerErrorException(`OpenAI Realtime API session creation failed: ${err}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI Realtime session error:', errText);
      throw new InternalServerErrorException(
        `OpenAI Realtime API session creation failed (${response.status}): ${errText}`,
      );
    }

    const data = await response.json();

    const ephemeralToken = data.client_secret?.value || data.value || data.client_secret;

    return {
      ephemeral_token: ephemeralToken,
      expires_at: data.client_secret?.expires_at || data.expires_at,
      openai_session_id: data.id,
      model: data.model,
    };
  }

  // Generates a short Korean sample clip so admins can preview a voice before
  // assigning it to a persona, without needing to open a full realtime session.
  async getVoicePreview(voice: string): Promise<{ audioBase64: string; contentType: string }> {
    if (!AVAILABLE_VOICES.includes(voice)) {
      throw new BadRequestException(`Unsupported voice: ${voice}`);
    }

    let response: Response;
    try {
      response = await callOpenAI('audio/speech', {
        model: 'gpt-4o-mini-tts',
        voice,
        input: VOICE_PREVIEW_TEXT,
        response_format: 'mp3',
      }, 'Voice preview generation');
    } catch (err) {
      console.error('OpenAI voice preview error:', err);
      throw new InternalServerErrorException(`Voice preview generation failed: ${err}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI voice preview error:', errText);
      throw new InternalServerErrorException(
        `Voice preview generation failed (${response.status}): ${errText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      audioBase64: Buffer.from(arrayBuffer).toString('base64'),
      contentType: 'audio/mpeg',
    };
  }
}
