import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat/chat.service';
import { CallLogService } from '../call-log/call-log.service';
import { VoiceService } from '../voice/voice.service';

@WebSocketGateway({ cors: true })
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly callLogService: CallLogService,
    private readonly voiceService: VoiceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      const authToken = client.handshake.auth?.token;
      const rawToken = authToken || (authHeader ? authHeader.replace('Bearer ', '') : null);

      if (rawToken) {
        try {
          const decoded = this.jwtService.verify(rawToken, {
            secret: process.env.JWT_SECRET || 'secretKey',
          });
          (client as any).user = decoded;
          console.log(`Authenticated Socket Client connected: ${client.id}`);
        } catch {
          // Candidates connecting via magic link or direct session
          console.log(`Candidate Socket Client connected: ${client.id}`);
        }
      } else {
        console.log(`Candidate / Public Socket Client connected: ${client.id}`);
      }
    } catch (err) {
      console.warn(`Socket connection warning for ${client.id}:`, err?.message);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-call')
  handleJoinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody('sessionId') sessionId: number,
  ) {
    if (!sessionId) {
      client.emit('error', { message: 'Session ID is required.' });
      return;
    }
    client.join(`session-${sessionId}`);
    client.emit('joined', { sessionId });
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('sessionId') sessionId: number,
    @MessageBody('text') text: string,
  ) {
    try {
      if (!sessionId || !text) return;
      await this.callLogService.createLog(sessionId, text, 'TRANSCRIPT_USER');
      
      const aiResponse = (await this.chatService.chat(text, sessionId)) || '';
      await this.callLogService.createLog(sessionId, aiResponse, 'TRANSCRIPT_AI');

      this.server.to(`session-${sessionId}`).emit('ai-response', {
        text: aiResponse,
      });
    } catch (error) {
      console.error('Chat message error:', error);
      client.emit('error', { message: 'AI processing encountered an error.' });
    }
  }

  @SubscribeMessage('audio-message')
  async handleAudioMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('sessionId') sessionId: number,
    @MessageBody('audio') audioBuffer: any,
    @MessageBody('language') language?: string,
  ) {
    try {
      if (!sessionId || !audioBuffer) return;
      const text = await this.voiceService.transcribeBuffer(audioBuffer, 'voice.webm', language);
      await this.callLogService.createLog(sessionId, text, 'TRANSCRIPT_USER_AUDIO');

      const aiResponse = (await this.chatService.chat(text, sessionId)) || '';
      await this.callLogService.createLog(sessionId, aiResponse, 'TRANSCRIPT_AI_AUDIO');

      const responseAudioBuffer = await this.voiceService.synthesizeSpeech(aiResponse);

      this.server.to(`session-${sessionId}`).emit('ai-audio-response', {
        text: aiResponse,
        audio: responseAudioBuffer,
      });
    } catch (error) {
      console.error('Audio message error:', error);
      client.emit('error', { message: 'Audio processing or transcription failed' });
    }
  }
}
