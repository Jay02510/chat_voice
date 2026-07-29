import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VoiceModule } from './voice/voice.module';
import { PrismaModule } from './prisma/prisma.module';
import { CandidateModule } from './candidate/candidate.module';
import { CallSessionModule } from './call-session/call-session.module';
import { CallLogModule } from './call-log/call-log.module';
import { AuthModule } from './auth/auth.module';
import { PersonaModule } from './persona/persona.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'logs'),
      serveRoot: '/logs',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ChatModule,
    VoiceModule,
    PrismaModule,
    CandidateModule,
    CallSessionModule,
    CallLogModule,
    AuthModule,
    PersonaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}