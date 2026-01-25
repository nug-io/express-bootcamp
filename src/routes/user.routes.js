import * as userController from '../controllers/user.controller.js';
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);

export default router;
