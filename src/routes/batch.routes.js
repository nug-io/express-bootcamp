import express from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { createBatchSchema, updateBatchSchema } from '../validators/batch.schema.js';
import * as batchController from '../controllers/batch.controller.js';

const router = express.Router();

// Public
router.get('/', batchController.getBatches);
router.get('/:id', batchController.getBatch);

// Admin Only
router.post('/', authenticate, authorize(['ADMIN']), validate(createBatchSchema), batchController.createBatch);
router.put('/:id', authenticate, authorize(['ADMIN']), validate(updateBatchSchema), batchController.updateBatch);

export default router;
