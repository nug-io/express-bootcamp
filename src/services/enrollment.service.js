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

export const getBatchParticipants = async (query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const keyword = query.q?.trim();
  const batchId = query.batchId ? parseInt(query.batchId) : null;

  // 1. Jika batchId ada
  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });

    if (!batch) {
      throwError('Batch not found', 404);
    }
  }

  // 2. Filter user (search)
  const userWhere = keyword
    ? {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { email: { contains: keyword, mode: 'insensitive' } },
        ],
      }
    : {};

  // 3. Filter enrollment (batch optional)
  const enrollmentWhere = {
    ...(batchId && { batch_id: batchId }),
    ...(userWhere && { user: userWhere }),
  };

  // 4. Sorting
  const allowedOrderBy = {
    enrolled_at: true,
    'user.name': true,
    'user.email': true,
    'batch.title': true,
  };

  const orderField = query.orderBy || 'enrolled_at';
  const orderDir = query.orderDir === 'asc' ? 'asc' : 'desc';

  let orderBy;

  if (allowedOrderBy[orderField]) {
    if (orderField.includes('.')) {
      const [relation, field] = orderField.split('.');
      orderBy = { [relation]: { [field]: orderDir } };
    } else {
      orderBy = { [orderField]: orderDir };
    }
  } else {
    orderBy = { enrolled_at: 'desc' };
  }

  // 5. Query DB
  // 5. Query DB
  const [participants, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
          },
        },
        batch: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.enrollment.count({
      where: enrollmentWhere,
    }),
  ]);

  return {
    data: participants.map((p) => ({
      user: p.user,
      batch: {
        id: p.batch.id,
        title: p.batch.title,
      },
      enrolled_at: p.enrolled_at,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy: query.orderBy || 'enrolled_at',
      orderDir,
    },
  };
};
