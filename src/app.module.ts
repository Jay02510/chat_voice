import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { RequestLoggingMiddleware } from './common/request-logging.middleware';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { CandidateModule } from './candidate/candidate.module';
import { CallSessionModule } from './call-session/call-session.module';
import { CallLogModule } from './call-log/call-log.module';
import { AuthModule } from './auth/auth.module';
import { PersonaModule } from './persona/persona.module';
import { SettingsModule } from './settings/settings.module';
import { TierModule } from './tier/tier.module';
import { ScenarioTypeModule } from './scenario-type/scenario-type.module';
import { VoisorModule } from './voisor/voisor.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 minute window
      limit: 100,   // default: 100 req/min per IP for any endpoint without an override
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'logs'),
      serveRoot: '/logs',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    AuthModule,
    PrismaModule,
    CandidateModule,
    CallSessionModule,
    CallLogModule,
    PersonaModule,
    SettingsModule,
    TierModule,
    ScenarioTypeModule,
    VoisorModule,
    RealtimeModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}