import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';

export const getMaterialsByBatchId = async (batchId, userId, userRole) => {
  // If not admin, check enrollment
  if (userRole === 'USER') {
    await ensurePaidEnrollment(userId, parseInt(batchId));
  }

  if (userRole === 'MENTOR') await ensureMentorBatch(userId, parseInt(batchId));

  return prisma.material.findMany({
    where: { batch_id: parseInt(batchId), deleted_at: null },
    orderBy: { order: 'asc' },
  });
};

export const getMaterialById = async (id, userId, userRole) => {
  const material = await prisma.material.findFirst({
    where: { id: parseInt(id), deleted_at: null },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  if (userRole === 'USER') {
    await ensurePaidEnrollment(userId, material.batch_id);
  }

  if (userRole === 'MENTOR') await ensureMentorBatch(userId, material.batch_id);

  return material;
};

export const createMaterial = async (data) => {
  // Check if batch exists
  const batch = await prisma.batch.findFirst({
    where: { id: data.batch_id, deleted_at: null },
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
  const material = await prisma.material.findFirst({
    where: { id: parseInt(id), deleted_at: null },
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
  const material = await prisma.material.findFirst({
    where: { id: parseInt(id), deleted_at: null },
  });

  if (!material) {
    throwError('Material not found', 404);
  }

  return prisma.material.update({
    where: { id: parseInt(id) },
    data: { deleted_at: new Date() },
  });
};

export const updateMaterialProgress = async (materialId, userId) => {
  const material = await prisma.material.findFirst({
    where: { id: parseInt(materialId), deleted_at: null },
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
    where: { batch_id: parseInt(batchId), deleted_at: null },
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
    where: { batch_id: parseInt(batchId), deleted_at: null },
  });

  const completed = await prisma.materialProgress.count({
    where: {
      user_id: userId,
      completed: true,
      material: {
        batch_id: parseInt(batchId),
        batch: { deleted_at: null },
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

const ensureMentorBatch = async (mentorId, batchId) => {
  const mentor = await prisma.mentorProfile.findFirst({
    where: { user_id: mentorId },
  });

  if (!mentor) throwError('Access denied', 403);

  const relation = await prisma.batchMentor.findFirst({
    where: {
      mentor_id: mentor.id,
      batch_id: batchId,
      deleted_at: null,
    },
  });

  if (!relation) {
    throwError('Access denied', 403);
  }
};
