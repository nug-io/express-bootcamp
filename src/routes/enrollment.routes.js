import express from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { createEnrollmentSchema } from '../validators/enrollment.schema.js';
import * as enrollmentController from '../controllers/enrollment.controller.js';

const router = express.Router();

router.use(authenticate);

// List enrollment (Admin Only)
router.get(
	'/',
	authorize(['ADMIN']),
	enrollmentController.getBatchParticipants
);

router.post('/', validate(createEnrollmentSchema), enrollmentController.enroll);
router.get('/my-enrollments', enrollmentController.getMyEnrollments);

export default router;
