import express from 'express';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

export default router;
