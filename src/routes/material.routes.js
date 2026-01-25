import express from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { createMaterialSchema, updateMaterialSchema } from '../validators/material.schema.js';
import * as materialController from '../controllers/material.controller.js';

const router = express.Router();

router.use(authenticate);

// List materials (Enrolled User or Admin)
router.get('/batch/:batchId', materialController.getBatchMaterials);

// Admin Only
router.post('/', authorize(['ADMIN']), validate(createMaterialSchema), materialController.createMaterial);
router.put('/:id', authorize(['ADMIN']), validate(updateMaterialSchema), materialController.updateMaterial);
router.delete('/:id', authorize(['ADMIN']), materialController.deleteMaterial);

export default router;
