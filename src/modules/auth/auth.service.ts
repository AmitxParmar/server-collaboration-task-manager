import { type User } from '@prisma/client';
import authRepository from './auth.repository';
import jwtService from '@/lib/jwt';
import passwordService from '@/lib/password';
import { type TokenPair, type SafeUser } from '@/types/auth.type';
import { HttpUnAuthorizedError, HttpBadRequestError } from '@/lib/errors';
import LogMessage from '@/decorators/log-message.decorator';

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: SafeUser;
  tokens: TokenPair;
}

export default class AuthService {
  @LogMessage<[RegisterInput]>({ message: 'User registration' })
  public async register(
    data: RegisterInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new HttpBadRequestError('Registration failed', [
        'User with this email already exists',
      ]);
    }

    // Hash password
    const passwordHash = await passwordService.hash(data.password);

    // Create user
    const user = await authRepository.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    // Generate tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Create session
    await authRepository.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + jwtService.getRefreshExpiryMs()),
    });

    return { user, tokens };
  }

  @LogMessage<[LoginInput]>({ message: 'User login' })
  public async login(
    data: LoginInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    // Find user
    const user = await authRepository.findUserByEmail(data.email);
    if (!user) {
      throw new HttpUnAuthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await passwordService.compare(
      data.password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new HttpUnAuthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    // Create session
    await authRepository.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + jwtService.getRefreshExpiryMs()),
    });

    // Return user without password
    const { passwordHash, ...safeUser } = user;
    return { user: safeUser as SafeUser, tokens };
  }

  public async logout(refreshToken: string): Promise<void> {
    const session = await authRepository.findSessionByToken(refreshToken);
    if (session) {
      await authRepository.deleteSession(refreshToken);
    }
  }

  public async logoutAll(userId: string): Promise<void> {
    await authRepository.deleteAllUserSessions(userId);
  }

  public async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new HttpUnAuthorizedError('Invalid or expired refresh token');
    }

    // Find session
    const session = await authRepository.findSessionByToken(refreshToken);
    if (!session) {
      throw new HttpUnAuthorizedError('Session not found or expired');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await authRepository.deleteSession(refreshToken);
      throw new HttpUnAuthorizedError('Session expired');
    }

    // Delete old session
    await authRepository.deleteSession(refreshToken);

    // Generate new tokens
    const tokens = jwtService.generateTokenPair({
      userId: payload.userId,
      email: payload.email,
    });

    // Create new session with new refresh token
    await authRepository.createSession({
      userId: payload.userId,
      refreshToken: tokens.refreshToken,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + jwtService.getRefreshExpiryMs()),
    });

    return tokens;
  }

  public async validateAccessToken(accessToken: string): Promise<SafeUser | null> {
    const payload = jwtService.verifyAccessToken(accessToken);
    if (!payload) {
      return null;
    }

    return authRepository.findUserById(payload.userId);
  }

  public async getCurrentUser(userId: string): Promise<SafeUser | null> {
    return authRepository.findUserById(userId);
  }
}
