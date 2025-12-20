import { type NextFunction, type Response } from 'express';
import { type AuthRequest } from '@/types/auth.type';
import jwtService from '@/lib/jwt';
import authRepository from '@/modules/auth/auth.repository';
import { HttpUnAuthorizedError } from '@/lib/errors';

export const verifyAuthToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get access token from cookies
    const accessToken = req.cookies?.access_token;

    if (!accessToken) {
      throw new HttpUnAuthorizedError('Access token not provided');
    }

    // Verify access token
    const payload = jwtService.verifyAccessToken(accessToken);
    if (!payload) {
      throw new HttpUnAuthorizedError('Invalid or expired access token');
    }

    // Get user from database
    const user = await authRepository.findUserById(payload.userId);
    if (!user) {
      throw new HttpUnAuthorizedError('User not found');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
