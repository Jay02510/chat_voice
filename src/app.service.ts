import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthService } from './auth/auth.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit() {
    await this.authService.seedSuperAdmin();
  }

  getHello(): string {
    return 'VODABI Voice Evaluation API v3';
  }
}
