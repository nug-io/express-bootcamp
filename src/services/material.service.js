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

export const updateMaterialProgress = async (materialId, userId) => {
  const material = await prisma.material.findUnique({
    where: { id: parseInt(materialId) },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  await ensurePaidEnrollment(userId, material.batch_id);

  return prisma.materialProgress.upsert({
    where: {
      user_id_material_id: {
        user_id: userId,
        material_id: material.id,
      },
    },
    update: {
      completed: true,
    },
    create: {
      user_id: userId,
      material_id: material.id,
      completed: true,
    },
  });
};

export const getBatchProgress = async (batchId, userId) => {
  const materials = await prisma.material.findMany({
    where: { batch_id: parseInt(batchId) },
    select: { id: true },
  });

  const progress = await prisma.materialProgress.findMany({
    where: {
      user_id: userId,
      material_id: { in: materials.map((m) => m.id) },
    },
  });

  return progress;
};

export const getBatchProgressSummary = async (batchId, userId) => {
  const totalMaterials = await prisma.material.count({
    where: { batch_id: parseInt(batchId) },
  });

  const completed = await prisma.materialProgress.count({
    where: {
      user_id: userId,
      completed: true,
      material: {
        batch_id: parseInt(batchId),
      },
    },
  });

  return {
    total_materials: totalMaterials,
    completed,
    progress_percent:
      totalMaterials === 0 ? 0 : Math.round((completed / totalMaterials) * 100),
  };
};
