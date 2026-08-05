import { Controller, Post, Body, Get, Put, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // Self-registration is disabled for non-admin users.
  // Use POST /auth/users to create users (ADMIN/SUPER_ADMIN only).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('users')
  createUser(
    @Body() body: { email: string; password: string; name?: string; role?: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' },
    @Req() req: any,
  ) {
    // ADMIN can only create MANAGERs, not other ADMINs
    const targetRole = body.role || 'MANAGER';
    if (req.user.role === 'ADMIN' && (targetRole === 'SUPER_ADMIN' || targetRole === 'ADMIN')) {
      throw new Error('ADMIN can only create MANAGER accounts.');
    }
    return this.authService.register(body.email, body.password, body.name, targetRole);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('users')
  listUsers(@Req() req: any) {
    return this.authService.listUsers(req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Put('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: any, @Req() req: any) {
    return this.authService.updateUserRole(+id, role, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.authService.deleteUser(+id, req.user.id, req.user.role);
  }

  // Returns the current logged-in user's profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role };
  }
}
