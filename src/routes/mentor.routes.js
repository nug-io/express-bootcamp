import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as mentorController from '../controllers/mentor.controller.js';

const router = express.Router();

// public
router.get('/', mentorController.getMentors);
router.get('/:id', mentorController.getMentor);

// admin
router.post(
  '/',
  authenticate,
  authorize(['ADMIN']),
  mentorController.createMentor
);

router.patch(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  mentorController.updateMentor
);

export default router;
