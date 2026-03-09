import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.js';
import { updateUserRoleSchema } from '../validators/user.schema.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

router.use(authenticate);

// user
router.get('/me', userController.getMe);

// admin
router.get('/', authorize(['ADMIN']), userController.getUsers);
router.get('/:id', authorize(['ADMIN']), userController.getUser);

router.patch(
  '/:id/role',
  authorize(['ADMIN']),
  validate(updateUserRoleSchema),
  userController.updateUserRole
);

router.patch('/:id/suspend', authorize(['ADMIN']), userController.suspendUser);
router.patch('/:id/ban', authorize(['ADMIN']), userController.banUser);

router.delete('/:id', authorize(['ADMIN']), userController.deleteUser);

export default router;
