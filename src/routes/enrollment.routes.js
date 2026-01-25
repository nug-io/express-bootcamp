import express from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { createEnrollmentSchema } from '../validators/enrollment.schema.js';
import * as enrollmentController from '../controllers/enrollment.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createEnrollmentSchema), enrollmentController.enroll);
router.get('/my-enrollments', enrollmentController.getMyEnrollments);

export default router;
