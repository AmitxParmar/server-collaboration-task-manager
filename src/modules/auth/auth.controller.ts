import { type NextFunction, type Request, } from 'express';
import { HttpStatusCode } from 'axios';
import AuthService from './auth.service';
import { type CustomResponse } from '@/types/common.type';
import { type SafeUser, type AuthRequest } from '@/types/auth.type';
import Api from '@/lib/api';
import { cookieService } from '@/utils/cookies';

export default class AuthController extends Api {
  private readonly authService = new AuthService();

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

      cookieService.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
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

      cookieService.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
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

      cookieService.clearTokenCookies(res);
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

      cookieService.clearTokenCookies(res);
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
        cookieService.clearTokenCookies(res);
        return res.status(HttpStatusCode.Unauthorized).send({
          message: 'No refresh token provided',
          code: 'REFRESH_TOKEN_MISSING',
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

      cookieService.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
      this.send(res, null, HttpStatusCode.Ok, 'Tokens refreshed successfully');
    } catch (e) {
      cookieService.clearTokenCookies(res);
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

  public updateProfile = async (
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

      const user = await this.authService.updateProfile(req.user.id, req.body);
      this.send(res, user, HttpStatusCode.Ok, 'Profile updated successfully');
    } catch (e) {
      next(e);
    }
  };
}
