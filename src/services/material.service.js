import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';

export const getMaterialsByBatchId = async (batchId, userId, userRole) => {
  // If not admin, check enrollment
  if (userRole !== 'ADMIN') {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        user_id_batch_id: {
          user_id: userId,
          batch_id: parseInt(batchId),
        },
      },
    });

    if (!enrollment) {
      throwError('You are not enrolled in this batch', 403);
    }
  }

  return prisma.material.findMany({
    where: { batch_id: parseInt(batchId) },
    orderBy: { order: 'asc' },
  });
};

export const createMaterial = async (data) => {
  // Check if batch exists
  const batch = await prisma.batch.findUnique({
    where: { id: data.batch_id },
  });

  if (!batch) {
    throwError('Batch not found', 404);
  }

  return prisma.material.create({
    data,
  });
};

export const updateMaterial = async (id, data) => {
  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  return prisma.material.update({
    where: { id: parseInt(id) },
    data,
  });
};

export const deleteMaterial = async (id) => {
  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  return prisma.material.delete({
    where: { id: parseInt(id) },
  });
};
