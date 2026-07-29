import { Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import OpenAI, { toFile } from 'openai';

const LOGS_DIR = join(__dirname, '..', '..', 'logs');

@Injectable()
export class VoiceService {

  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });


  async transcribe(file: any) {
    const result = await this.openai.audio.transcriptions.create({
      file: await toFile(file.buffer, file.originalname),
      model: 'whisper-1',
    });
    return result.text;
  }

  async transcribeBuffer(buffer: Buffer, originalname: string = 'audio.webm') {
    const result = await this.openai.audio.transcriptions.create({
      file: await toFile(buffer, originalname),
      model: 'whisper-1',
    });
    return result.text;
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    const mp3 = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  }

  saveAudio(file: any) {

    mkdirSync(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = extname(file.originalname) || '.webm';
    const fileName = `voice-${timestamp}${ext}`;

    writeFileSync(join(LOGS_DIR, fileName), file.buffer);

    return fileName;
  }
}