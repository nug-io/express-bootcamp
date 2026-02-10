import crypto from 'crypto';
import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';
import { MIDTRANS } from '../utils/midtrans.js';

export const handleCallback = async (req, res) => {
  const { order_id, transaction_status, signature_key } = req.body;

  console.log('MIDTRANS CALLBACK HIT');
  console.log(req.body);

  // 1. Verify signature
  const expectedSignature = crypto
    .createHash('sha512')
    .update(
      order_id +
        req.body.status_code +
        req.body.gross_amount +
        MIDTRANS.serverKey
    )
    .digest('hex');

  if (signature_key !== expectedSignature) {
    throwError('Invalid signature', 403);
  }

  // 2. Ambil enrollment id
  const enrollmentId = parseInt(order_id.replace('ENROLL-', ''), 10);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    throwError('Enrollment not found', 404);
  }

  // 3. Idempotency guard
  if (enrollment.payment_status === 'PAID') {
    return res.json({ received: true });
  }

  if (enrollment.payment_status === 'EXPIRED') {
    return res.json({ received: true });
  }

  // 4. Update status
  if (transaction_status === 'settlement') {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { payment_status: 'PAID' },
    });
  }

  res.json({ received: true });
};
