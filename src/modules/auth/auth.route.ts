import { Router } from 'express';
import Controller from './auth.controller';
import { RegisterDto, LoginDto, UpdateProfileDto } from '@/dto/user.dto';
import RequestValidator from '@/middlewares/request-validator';
import { verifyAuthToken } from '@/middlewares/auth';

const auth: Router = Router();
const controller = new Controller();

/**
 * Register user body
 * @typedef {object} RegisterBody
 * @property {string} email.required - email of user
 * @property {string} name.required - name of user
 * @property {string} password.required - password (min 8 characters)
 */
/**
 * Login body
 * @typedef {object} LoginBody
 * @property {string} email.required - email of user
 * @property {string} password.required - password
 */
/**
 * User
 * @typedef {object} User
 * @property {string} id - user id
 * @property {string} email - email of user
 * @property {string} name - name of user
 * @property {string} createdAt - created timestamp
 * @property {string} updatedAt - updated timestamp
 */

/**
 * POST /auth/register
 * @summary Register a new user
 * @tags auth
 * @param {RegisterBody} request.body.required
 * @return {User} 201 - user created with tokens in cookies
 */
auth.post(
  '/register',
  RequestValidator.validate(RegisterDto),
  controller.register
);

/**
 * POST /auth/login
 * @summary Login user
 * @tags auth
 * @param {LoginBody} request.body.required
 * @return {User} 200 - login successful with tokens in cookies
 */
auth.post('/login', RequestValidator.validate(LoginDto), controller.login);

/**
 * POST /auth/logout
 * @summary Logout user (clears session and cookies)
 * @tags auth
 * @return {object} 200 - logout successful
 */
auth.post('/logout', controller.logout);

/**
 * POST /auth/logout-all
 * @summary Logout from all devices
 * @tags auth
 * @security bearerAuth
 * @return {object} 200 - logged out from all devices
 */
auth.post('/logout-all', verifyAuthToken, controller.logoutAll);

/**
 * POST /auth/refresh
 * @summary Refresh access and refresh tokens
 * @tags auth
 * @return {object} 200 - tokens refreshed
 */
auth.post('/refresh', controller.refresh);

/**
 * GET /auth/me
 * @summary Get current authenticated user
 * @tags auth
 * @security bearerAuth
 * @return {User} 200 - current user
 */
auth.get('/me', verifyAuthToken, controller.me);

/**
 * PATCH /auth/me
 * @summary Update current user profile
 * @tags auth
 * @security bearerAuth
 * @param {UpdateProfileDto} request.body.required
 * @return {User} 200 - updated user
 */
auth.patch(
  '/me',
  verifyAuthToken,
  RequestValidator.validate(UpdateProfileDto),
  controller.updateProfile
);

export default auth;
