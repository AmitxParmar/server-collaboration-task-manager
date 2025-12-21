import environment from '@/lib/environment';
import type { Response, CookieOptions } from 'express';


export class CookieService {
    private getCookieOptions(maxAge: number): CookieOptions {
        return {
            httpOnly: true,
            secure: !environment.isDev(),
            sameSite: environment.isDev() ? 'lax' : 'strict',
            maxAge,
            path: '/',
        };
    }

    public setTokenCookies(
        res: Response,
        accessToken: string,
        refreshToken: string
    ): void {
        // Access token - 15 minutes
        res.cookie('access_token', accessToken, this.getCookieOptions(15 * 60 * 1000));

        // Refresh token - 7 days
        res.cookie('refresh_token', refreshToken, this.getCookieOptions(7 * 24 * 60 * 60 * 1000));
    }

    public clearTokenCookies(res: Response): void {
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/' });
    }
}

export const cookieService = new CookieService();
