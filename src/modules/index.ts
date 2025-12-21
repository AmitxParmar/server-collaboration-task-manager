import { Router } from 'express';

import auth from './auth/auth.route';
import task from './task/task.route';
import notification from './notification/notification.route';

const router: Router = Router();

router.use('/auth', auth);
router.use('/tasks', task);
router.use('/notifications', notification);
// router.use("/projects", projects);

export default router;


