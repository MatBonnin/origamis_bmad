import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma';
import {
  RegisterDto,
  LoginDto,
  UserResponseDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { MailService } from '../mail';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'Un compte existe déjà avec cet email',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Find or create role
    let role = await this.prisma.roles.findUnique({
      where: { name: dto.role },
    });

    if (!role) {
      role = await this.prisma.roles.create({
        data: { name: dto.role },
      });
    }

    // Create user with role
    const user = await this.prisma.users.create({
      data: {
        email: dto.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: dto.firstName,
        last_name: dto.lastName,
        user_roles: {
          create: {
            role_id: role.id,
          },
        },
      },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      user: this.mapUserToResponse(user),
      token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      });
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: this.mapUserToResponse(user),
      token,
    };
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    return this.mapUserToResponse(user);
  }

  async validateUser(userId: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapUserToResponse(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const user = await this.prisma.users.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { ok: true };
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Update user with reset token (invalidates any previous token)
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password_reset_token_hash: tokenHash,
        password_reset_expires_at: expiresAt,
        password_reset_used_at: null,
      },
    });

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(
      user.email,
      token,
      user.first_name,
    );

    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find user with matching token hash
    const user = await this.prisma.users.findFirst({
      where: {
        password_reset_token_hash: tokenHash,
      },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'Token de réinitialisation invalide ou expiré',
      });
    }

    // Check if token is expired
    if (!user.password_reset_expires_at || user.password_reset_expires_at < new Date()) {
      throw new BadRequestException({
        code: 'TOKEN_EXPIRED',
        message: 'Token de réinitialisation invalide ou expiré',
      });
    }

    // Check if token was already used
    if (user.password_reset_used_at) {
      throw new BadRequestException({
        code: 'TOKEN_USED',
        message: 'Token de réinitialisation invalide ou expiré',
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Update password and mark token as used
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_reset_used_at: new Date(),
      },
    });

    return { ok: true };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }

  private mapUserToResponse(user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: Date;
    user_roles: { role: { name: string } }[];
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.user_roles.map((ur) => ur.role.name),
      createdAt: user.created_at,
    };
  }
}
