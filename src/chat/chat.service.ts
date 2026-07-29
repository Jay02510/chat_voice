import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

const LOGS_DIR = join(__dirname, '..', '..', 'logs');

@Injectable()
export class ChatService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private prisma: PrismaService) {}

  private async getSystemPrompt(): Promise<string> {
    const activePersona = await this.prisma.persona.findFirst({
      where: { isActive: true },
    });
    return activePersona?.prompt || 'You are a helpful AI assistant.';
  }

  async chat(message: string) {
    const systemPrompt = await this.getSystemPrompt();
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    return response.choices[0].message.content;
  }

  async synthesizeSpeech(text: string): Promise<string> {
    const speech = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    });

    mkdirSync(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `reply-${timestamp}.mp3`;

    writeFileSync(
      join(LOGS_DIR, fileName),
      Buffer.from(await speech.arrayBuffer()),
    );

    return fileName;
  }

  saveConversation(conversation: { role: 'user' | 'ai'; text: string }[]) {
    mkdirSync(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `conversation-${timestamp}.txt`;

    const content = conversation
      .map((entry) => `${entry.role === 'user' ? '나' : 'GPT'} : ${entry.text}`)
      .join('\n');

    writeFileSync(join(LOGS_DIR, fileName), content, 'utf-8');

    return fileName;
  }
}