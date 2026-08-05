import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {

  constructor(
    private readonly voiceService: VoiceService,
  ) {}


  @Post()
  @UseInterceptors(
    FileInterceptor('audio'),
  )
  async upload(
    @UploadedFile() file: any,
  ) {

    if (!file) {
      throw new BadRequestException(
        '음성 파일이 없습니다.'
      );
    }

    console.log(file);

    const text =
      await this.voiceService.transcribe(file);

    const audioFileName =
      this.voiceService.saveAudio(file);


    return {
      text,
      audioFileName,
    };
  }
}