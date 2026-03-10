import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';
import { parseId } from '../utils/parseId.js';

export const getBatchMentors = async (batchId) => {
  const batch = await prisma.batch.findUnique({
    where: { id: parseId(batchId) },
  });

  if (!batch) throwError('Batch not found', 404);

  const mentors = await prisma.batchMentor.findMany({
    where: {
      batch_id: parseId(batchId),
      deleted_at: null,
    },
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          bio: true,
          linkedin: true,
          github: true,
          website: true,
        },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  return mentors.map((m) => m.mentor);
};

export const addBatchMentor = async (batchId, mentorId) => {
  const batch = await prisma.batch.findUnique({
    where: { id: parseId(batchId) },
  });

  if (!batch) throwError('Batch not found', 404);

  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: parseId(mentorId) },
  });

  if (!mentor) throwError('Mentor not found', 404);

  const existing = await prisma.batchMentor.findFirst({
    where: {
      batch_id: parseId(batchId),
      mentor_id: parseId(mentorId),
      deleted_at: null,
    },
  });

  if (existing) {
    throwError('Mentor already assigned to this batch', 409);
  }

  return prisma.batchMentor.create({
    data: {
      batch_id: parseId(batchId),
      mentor_id: parseId(mentorId),
    },
  });
};

export const removeBatchMentor = async (batchId, mentorId) => {
  const relation = await prisma.batchMentor.findFirst({
    where: {
      batch_id: parseId(batchId),
      mentor_id: parseId(mentorId),
      deleted_at: null,
    },
  });

  if (!relation) {
    throwError('Batch mentor not found', 404);
  }

  return prisma.batchMentor.update({
    where: { id: relation.id },
    data: {
      deleted_at: new Date(),
    },
  });
};
