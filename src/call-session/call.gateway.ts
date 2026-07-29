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
import { ChatService } from '../chat/chat.service';
import { CallLogService } from '../call-log/call-log.service';
import { VoiceService } from '../voice/voice.service';

@WebSocketGateway({ cors: true })
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly callLogService: CallLogService,
    private readonly voiceService: VoiceService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-call')
  handleJoinCall(
    @ConnectedSocket() client: Socket,
    @MessageBody('sessionId') sessionId: number,
  ) {
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
      // 1. Log user message
      await this.callLogService.createLog(sessionId, text, 'TRANSCRIPT_USER');
      
      // 2. Get AI response
      const aiResponse = await this.chatService.chat(text) || '';
      
      // 3. Log AI response
      await this.callLogService.createLog(sessionId, aiResponse, 'TRANSCRIPT_AI');

      // 4. Send back to client
      this.server.to(`session-${sessionId}`).emit('ai-response', {
        text: aiResponse,
      });
    } catch (error) {
      console.error('Chat message error:', error);
      client.emit('error', { message: 'AI is currently unavailable due to an error or rate limit.' });
    }
  }

  @SubscribeMessage('audio-message')
  async handleAudioMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody('sessionId') sessionId: number,
    @MessageBody('audio') audioBuffer: Buffer,
  ) {
    try {
      // 1. Transcribe audio to text
      const text = await this.voiceService.transcribeBuffer(audioBuffer);
      await this.callLogService.createLog(sessionId, text, 'TRANSCRIPT_USER_AUDIO');

      // 2. Get AI text response
      const aiResponse = await this.chatService.chat(text) || '';
      await this.callLogService.createLog(sessionId, aiResponse, 'TRANSCRIPT_AI_AUDIO');

      // 3. Synthesize text to speech
      const responseAudioBuffer = await this.voiceService.synthesizeSpeech(aiResponse);

      // 4. Stream response back to client (text + audio)
      this.server.to(`session-${sessionId}`).emit('ai-audio-response', {
        text: aiResponse,
        audio: responseAudioBuffer, // Send buffer directly via socket.io
      });
    } catch (error) {
      console.error('Audio message error:', error);
      client.emit('error', { message: 'Audio processing failed' });
    }
  }
}
