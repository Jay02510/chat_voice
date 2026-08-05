import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';

const REALTIME_MODEL = 'gpt-realtime';

@Injectable()
export class RealtimeService {
  constructor(private readonly chatService: ChatService) {}

  async createSession(sessionId?: number) {
    // Build the full persona + scenario + tier system prompt from the DB
    const systemPrompt = await this.chatService.getSessionSystemPrompt(sessionId);

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
            },
            noise_reduction: {
              type: 'near_field',       // Suppress room/background noise from triggering VAD (candidate is close to mic)
            },
            turn_detection: {
              type: 'server_vad',       // Voice Activity Detection — AI responds when candidate pauses
              threshold: 0.65,          // Sensitivity (0–1). Higher = less prone to false triggers on background noise
              prefix_padding_ms: 300,   // Include 300ms before speech onset
              silence_duration_ms: 900, // Wait 900ms of silence before AI starts responding
              create_response: true,    // Auto-generate AI response after VAD end
            },
          },
          output: {
            voice: 'alloy',
          },
        },
      },
    };

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

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
}
