import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: { message: string }) {
    try {
      const reply = await this.chatService.chat(body.message) || '';
      const audioFileName = await this.chatService.synthesizeSpeech(reply);

      return {
        reply,
        audioFileName,
      };
    } catch (error: any) {
      return {
        reply: `API Error: ${error.message || 'Unknown error'}`,
        audioFileName: null,
      };
    }
  }

  @Post('save')
  save(@Body() body: { conversation: { role: 'user' | 'ai'; text: string }[] }) {
    const fileName = this.chatService.saveConversation(body.conversation);

    return {
      fileName,
    };
  }
}