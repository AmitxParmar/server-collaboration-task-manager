
import { Request, Response, NextFunction } from 'express';
import UserService from './user.service';

class UserController {
    private userService = new UserService();

    /**
     * Get all users
     */
    public getAllUsers = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const search = req.query.search as string | undefined;
            const users = await this.userService.getAllUsers(search);
            res.status(200).json({
                data: users,
                message: 'Users retrieved successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default UserController;
