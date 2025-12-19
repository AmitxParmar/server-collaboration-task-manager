import { Router } from 'express';

import auth from './auth/auth.route';

const router: Router = Router();

router.use('/auth', auth);
// router.use("/projects", projects);

export default router;
