import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';
import { resolveBatchStatus } from '../utils/batchStatus.js';

export const getAllBatches = async () => {
  const batches = await prisma.batch.findMany({
    orderBy: { start_date: 'asc' },
    include: {
      _count: {
        select: { enrollments: true },
      },
    },
  });

  // tambahkan status & info kuota (computed, bukan DB)
  return batches.map((batch) => ({
    ...batch,
    status_effective: resolveBatchStatus(batch),
    enrolled_count: batch._count.enrollments,
    is_full: batch._count.enrollments >= batch.quota,
  }));
};

export const getBatchById = async (id) => {
  const batch = await prisma.batch.findUnique({
    where: { id: parseInt(id) },
    include: {
      materials: true,
      _count: {
        select: { enrollments: true },
      },
    },
  });

  if (!batch) {
    throwError('Batch not found', 404);
  }

  return {
    ...batch,
    status_effective: resolveBatchStatus(batch),
    enrolled_count: batch._count.enrollments,
    is_full: batch._count.enrollments >= batch.quota,
  };
};

export const createBatch = async (data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  if (startDate < new Date().setHours(0, 0, 0, 0)) {
    throwError('Batch cannot start in the past', 400);
  }

  if (endDate < startDate) {
    throwError('End date must be after start date', 400);
  }

  return prisma.batch.create({
    data: {
      title: data.title,
      start_date: startDate,
      end_date: endDate,
      price: data.price,
      quota: data.quota,
      status: 'ACTIVE',
    },
  });
};

export const updateBatch = async (id, data) => {
  const batch = await getBatchById(id);

  if (batch.status_effective !== 'OPEN' && (data.start_date || data.end_date)) {
    throwError('Cannot change dates after batch has started', 400);
  }

  const startDate = data.start_date
    ? new Date(data.start_date)
    : batch.start_date;

  const endDate = data.end_date ? new Date(data.end_date) : batch.end_date;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throwError('Batch cannot start in the past', 400);
  }

  if (endDate <= startDate) {
    throwError('End date must be after start date', 400);
  }

  return prisma.batch.update({
    where: { id: parseInt(id) },
    data: {
      ...data,
      start_date: startDate,
      end_date: endDate,
    },
  });
};
