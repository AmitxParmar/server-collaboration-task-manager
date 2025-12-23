
import prisma from '@/lib/prisma';
import { User } from '@prisma/client';

export class UserRepository {
    /**
     * Finds all users
     */
    public async findAll(search?: string): Promise<Omit<User, 'passwordHash'>[]> {
        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } }
            ]
        } : {};

        return prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    }
}

export default new UserRepository();
