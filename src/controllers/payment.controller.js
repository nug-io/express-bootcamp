import crypto from 'crypto';
import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';
import { MIDTRANS } from '../utils/midtrans.js';

export const handleCallback = async (req, res) => {
  const { order_id, transaction_status, signature_key } = req.body;

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

  if (transaction_status === 'settlement') {
    const invoiceNumber = generateInvoiceNumber();

    await prisma.enrollment.updateMany({
      where: {
        id: enrollmentId,
        payment_status: 'PENDING',
      },
      data: {
        payment_status: 'PAID',
        invoice_number: invoiceNumber,
      },
    });
  }

  res.json({ received: true });
};

function generateInvoiceNumber() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');

  return `INV-${yyyy}${mm}${dd}${hh}${mi}${ss}${ms}`;
}
