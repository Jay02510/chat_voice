import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import OpenAI, { toFile } from 'openai';

const LOGS_DIR = join(__dirname, '..', '..', 'logs');
const MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours auto-rotation

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async transcribe(file: any, language?: string) {
    const safeBuffer = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer?.data || file.buffer);

    const options: any = {
      file: await toFile(safeBuffer, file.originalname || 'voice.webm'),
      model: 'whisper-1',
    };
    if (language && language !== 'auto') {
      options.language = language;
    }
    const result = await this.openai.audio.transcriptions.create(options);
    return result.text;
  }

  async transcribeBuffer(bufferInput: any, originalname: string = 'audio.webm', language?: string) {
    try {
      let safeBuffer: Buffer;
      if (Buffer.isBuffer(bufferInput)) {
        safeBuffer = bufferInput;
      } else if (bufferInput && Array.isArray(bufferInput.data)) {
        safeBuffer = Buffer.from(bufferInput.data);
      } else if (bufferInput && bufferInput.buffer instanceof ArrayBuffer) {
        safeBuffer = Buffer.from(bufferInput.buffer);
      } else if (bufferInput instanceof ArrayBuffer) {
        safeBuffer = Buffer.from(bufferInput);
      } else if (typeof bufferInput === 'object') {
        safeBuffer = Buffer.from(Object.values(bufferInput));
      } else {
        safeBuffer = Buffer.from(bufferInput);
      }

      if (!safeBuffer || safeBuffer.length < 500) {
        this.logger.warn(`Audio buffer too small (${safeBuffer?.length || 0} bytes), skipping transcription.`);
        return '[Unclear speech / Too short]';
      }

      const fileObj = await toFile(safeBuffer, 'voice.webm', { type: 'audio/webm' });
      const options: any = {
        file: fileObj,
        model: 'whisper-1',
      };
      if (language && language !== 'auto') {
        options.language = language;
      }
      const result = await this.openai.audio.transcriptions.create(options);
      return result.text || '[Unclear Speech]';
    } catch (error: any) {
      this.logger.error('Whisper transcription failed details:', error?.message || error);
      throw error;
    }
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    const mp3 = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    this.cleanUpOldLogs().catch(() => {});
    return buffer;
  }

  async saveAudio(file: any) {
    await fs.mkdir(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = extname(file.originalname) || '.webm';
    const fileName = `voice-${timestamp}${ext}`;

    const safeBuffer = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer?.data || file.buffer);

    await fs.writeFile(join(LOGS_DIR, fileName), safeBuffer);
    this.cleanUpOldLogs().catch(() => {});

    return fileName;
  }

  private async cleanUpOldLogs() {
    try {
      const files = await fs.readdir(LOGS_DIR);
      const now = Date.now();
      for (const file of files) {
        const filePath = join(LOGS_DIR, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > MAX_FILE_AGE_MS) {
          await fs.unlink(filePath);
          this.logger.log(`Auto-cleaned old log file: ${file}`);
        }
      }
    } catch (e) {
      // Ignore if dir doesn't exist
    }
  }
}