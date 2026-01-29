import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';

export const enrollUser = async (userId, batchId) => {
  // 1. Ambil batch + jumlah enrollment
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!batch) {
    throwError('Batch not found', 404);
  }

  // 2. Admin override
  if (batch.status !== 'ACTIVE') {
    throwError('Batch is closed', 400);
  }

  const now = new Date();

  // 3. Batch harus belum mulai
  if (now >= batch.start_date) {
    throwError('Batch is not open for enrollment', 400);
  }

  // 4. Cek kuota
  if (batch._count.enrollments >= batch.quota) {
    throwError('Batch quota is full', 409);
  }

  // 5. Cek duplicate enrollment
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      user_id_batch_id: {
        user_id: userId,
        batch_id: batchId,
      },
    },
  });

  if (existingEnrollment) {
    throwError('User already enrolled in this batch', 409);
  }

  // 6. Enroll
  return prisma.enrollment.create({
    data: {
      user_id: userId,
      batch_id: batchId,
    },
    include: {
      batch: true,
    },
  });
};

export const getUserEnrollments = async (userId) => {
  return prisma.enrollment.findMany({
    where: { user_id: userId },
    include: {
      batch: true,
    },
    orderBy: {
      enrolled_at: 'desc',
    },
  });
};
