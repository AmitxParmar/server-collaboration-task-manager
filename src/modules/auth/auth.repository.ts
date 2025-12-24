import { type User, type Session } from '@prisma/client';
import prisma from '@/lib/prisma';
import { type SessionData, type SafeUser } from '@/types/auth.type';

export class AuthRepository {
    public async createUser(data: {
        email: string;
        name: string;
        passwordHash: string;
    }): Promise<SafeUser> {
        const user = await prisma.user.create({
            data,
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user as SafeUser;
    }

    public async findUserByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { email },
        });
    }

    public async findUserById(id: string): Promise<SafeUser | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user as SafeUser | null;
    }

    public async createSession(data: SessionData): Promise<Session> {
        return prisma.session.create({
            data: {
                userId: data.userId,
                refreshToken: data.refreshToken,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
                expiresAt: data.expiresAt,
            },
        });
    }

    public async findSessionByToken(refreshToken: string): Promise<Session | null> {
        return prisma.session.findUnique({
            where: { refreshToken },
        });
    }

    public async deleteSession(refreshToken: string): Promise<void> {
        await prisma.session.delete({
            where: { refreshToken },
        });
    }

    public async deleteAllUserSessions(userId: string): Promise<void> {
        await prisma.session.deleteMany({
            where: { userId },
        });
    }

    public async deleteExpiredSessions(): Promise<void> {
        await prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
    }

    public async updateUser(
        id: string,
        data: { name?: string; email?: string }
    ): Promise<SafeUser> {
        const user = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user as SafeUser;
    }
}

export default new AuthRepository();
