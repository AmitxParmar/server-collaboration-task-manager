
import userRepository from './user.repository';
import { User } from '@prisma/client';

export default class UserService {
    /**
     * Get all users
     */
    public async getAllUsers(search?: string): Promise<Omit<User, 'passwordHash'>[]> {
        return userRepository.findAll(search);
    }
}
