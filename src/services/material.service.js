import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';

export const getMaterialsByBatchId = async (batchId, userId, userRole) => {
  // If not admin, check enrollment
  if (userRole !== 'ADMIN') {
    await ensurePaidEnrollment(userId, parseInt(batchId));
  }

  return prisma.material.findMany({
    where: { batch_id: parseInt(batchId) },
    orderBy: { order: 'asc' },
  });
};

export const getMaterialById = async (id, userId, userRole) => {
  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  if (userRole !== 'ADMIN') {
    await ensurePaidEnrollment(userId, material.batch_id);
  }

  return material;
};

export const createMaterial = async (data) => {
  // Check if batch exists
  const batch = await prisma.batch.findUnique({
    where: { id: data.batch_id },
  });

  if (!batch) {
    throwError('Batch not found', 404);
  }

  const materialData = {
    title: data.title,
    content: data.content,
    order: data.order,
    batch_id: data.batch_id,
    video_url: data.video_url || null,
  };

  return prisma.material.create({
    data: materialData,
  });
};

export const updateMaterial = async (id, data) => {
  const material = await prisma.material.findUnique({
    where: { id: parseInt(id) },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  const materialData = {
    title: data.title,
    content: data.content,
    order: data.order,
    video_url: data.video_url ?? material.video_url,
  };

  return prisma.material.update({
    where: { id: parseInt(id) },
    data: materialData,
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

const ensurePaidEnrollment = async (userId, batchId) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      user_id: userId,
      batch_id: batchId,
      payment_status: 'PAID',
    },
  });

  if (!enrollment) {
    throwError('Access denied', 403);
  }
};
