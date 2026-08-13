import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, pass: string, name?: string, role: UserRole = 'MANAGER') {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        name: name || email.split('@')[0],
        role,
      },
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(pass, user.password || ''))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const payload = { email: user.email, sub: user.id, role: user.role, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async listUsers(requesterRole: UserRole) {
    if (requesterRole !== 'SUPER_ADMIN' && requesterRole !== 'ADMIN') {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can list users.');
    }
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  async updateUserRole(targetUserId: number, newRole: UserRole, requesterRole: UserRole) {
    if (requesterRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can change user roles.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async deleteUser(targetUserId: number, requesterId: number, requesterRole: UserRole) {
    if (requesterRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can delete users.');
    }
    if (targetUserId === requesterId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found.');

    await this.prisma.user.delete({ where: { id: targetUserId } });
    return { message: 'User deleted.' };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const valid = await bcrypt.compare(currentPassword || '', user.password || '');
    if (!valid) throw new UnauthorizedException('Current password is incorrect.');

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(newPassword, salt);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash } });

    return { message: 'Password updated successfully.' };
  }

  async seedSuperAdmin() {
    const existing = await this.prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (existing) return;

    // No hardcoded fallback — a well-known default password seeded silently
    // on a fresh install would grant full admin access to anyone who's read
    // this file. Fail loudly instead so ops sets a real credential.
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminPass = process.env.SUPER_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) {
      throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set to seed the first admin account.');
    }

    await this.register(adminEmail, adminPass, 'Super Admin', 'SUPER_ADMIN');
    console.log(`✅ SUPER_ADMIN seeded: ${adminEmail}`);
  }
}
