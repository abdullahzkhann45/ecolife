import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({
      $or: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) throw new ConflictException('Email or username already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({ ...dto, passwordHash });

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({
      $or: [{ email: dto.emailOrUsername }, { username: dto.emailOrUsername }],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signToken(user);
  }

  private signToken(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email, username: user.username, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(), email: user.email, username: user.username,
        onboardingCompleted: user.onboardingCompleted,
        role: user.role, gpsConsentShown: user.gpsConsentShown,
      },
    };
  }
}
