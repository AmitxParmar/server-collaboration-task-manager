import { type NextFunction, type Request, type Response } from 'express';
import { HttpStatusCode } from 'axios';
import AuthService from './auth.service';
import { type CustomResponse } from '@/types/common.type';
import { type SafeUser, type AuthRequest } from '@/types/auth.type';
import Api from '@/lib/api';
import environment from '@/lib/environment';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

export default class AuthController extends Api {
  private readonly authService = new AuthService();

  private getCookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: !environment.isDev(),
      sameSite: environment.isDev() ? 'lax' : 'strict',
      maxAge,
      path: '/',
    };
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
  ): void {
    // Access token - 15 minutes
    res.cookie('access_token', accessToken, this.getCookieOptions(15 * 60 * 1000));
    // Refresh token - 7 days
    res.cookie('refresh_token', refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000));
  }

  private clearTokenCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  public register = async (
    req: Request,
    res: CustomResponse<SafeUser>,
    next: NextFunction
  ) => {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, tokens } = await this.authService.register(
        req.body,
        userAgent,
        ipAddress
      );

      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      this.send(res, user, HttpStatusCode.Created, 'Registration successful');
    } catch (e) {
      next(e);
    }
  };

  public login = async (
    req: Request,
    res: CustomResponse<SafeUser>,
    next: NextFunction
  ) => {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, tokens } = await this.authService.login(
        req.body,
        userAgent,
        ipAddress
      );

      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      this.send(res, user, HttpStatusCode.Ok, 'Login successful');
    } catch (e) {
      next(e);
    }
  };

  public logout = async (
    req: Request,
    res: CustomResponse<null>,
    next: NextFunction
  ) => {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      this.clearTokenCookies(res);
      this.send(res, null, HttpStatusCode.Ok, 'Logout successful');
    } catch (e) {
      next(e);
    }
  };

  public logoutAll = async (
    req: AuthRequest,
    res: CustomResponse<null>,
    next: NextFunction
  ) => {
    try {
      if (req.user) {
        await this.authService.logoutAll(req.user.id);
      }

      this.clearTokenCookies(res);
      this.send(res, null, HttpStatusCode.Ok, 'Logged out from all devices');
    } catch (e) {
      next(e);
    }
  };

  public refresh = async (
    req: Request,
    res: CustomResponse<null>,
    next: NextFunction
  ) => {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        this.clearTokenCookies(res);
        return res.status(HttpStatusCode.Unauthorized).json({
          message: 'No refresh token provided',
          data: null,
        });
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const tokens = await this.authService.refreshTokens(
        refreshToken,
        userAgent,
        ipAddress
      );

      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      this.send(res, null, HttpStatusCode.Ok, 'Tokens refreshed successfully');
    } catch (e) {
      this.clearTokenCookies(res);
      next(e);
    }
  };

  public me = async (
    req: AuthRequest,
    res: CustomResponse<SafeUser | null>,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(HttpStatusCode.Unauthorized).json({
          message: 'Not authenticated',
          data: null,
        });
      }

      const user = await this.authService.getCurrentUser(req.user.id);
      this.send(res, user, HttpStatusCode.Ok, 'User retrieved successfully');
    } catch (e) {
      next(e);
    }
  };
}
