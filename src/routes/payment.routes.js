import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/midtrans/callback', paymentController.handleCallback);

export default router;
