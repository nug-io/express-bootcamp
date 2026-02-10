import prisma from '../config/db.js';

export const expirePendingEnrollments = async () => {
  const result = await prisma.enrollment.updateMany({
    where: {
      payment_status: 'PENDING',
      expires_at: { lt: new Date() },
    },
    data: { payment_status: 'EXPIRED' },
  });

  console.log(`Expired ${result.count} enrollments`);
};
