import { type NextFunction, type Request } from 'express';
import { type User } from '@prisma/client';
import { HttpStatusCode } from 'axios';
import UserService from './auth.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';

export default class UserController extends Api {
  private readonly userService = new UserService();

  public register = async (
    req: Request,
    res: CustomResponse<User>,
    next: NextFunction
  ) => {
    try {
      const user = await this.userService.register(req.body);
      this.send(res, user, HttpStatusCode.Created, 'register');
    } catch (e) {
      next(e);
    }
  };
}
