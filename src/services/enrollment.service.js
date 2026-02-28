import prisma from '../config/db.js';
import { Prisma } from '@prisma/client';
import { throwError } from '../utils/throwError.js';
import { createPayment } from './midtrans.service.js';

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
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: {
      user_id: userId,
      batch_id: batchId,
      payment_status: {
        in: ['PENDING', 'PAID'],
      },
    },
    orderBy: {
      enrolled_at: 'desc',
    },
  });

  if (existingEnrollment) {
    if (existingEnrollment.payment_status === 'PAID') {
      throwError('User already enrolled in this batch', 409);
    }

    if (existingEnrollment.payment_status === 'PENDING') {
      return {
        enrollment: existingEnrollment,
        resumePayment: true,
      };
    }
  }

  // 6. Enroll
  const ONE_DAY = 60 * 60 * 1000 * 24;

  const enrollment = await prisma.enrollment.create({
    data: {
      user_id: userId,
      batch_id: batchId,
      payment_status: batch.price > 0 ? 'PENDING' : 'PAID',
      expires_at: batch.price > 0 ? new Date(Date.now() + ONE_DAY) : null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
        },
      },
    },
  });

  if (batch.price > 0) {
    const payment = await createPayment({
      orderId: `ENROLL-${enrollment.id}`,
      amount: batch.price,
      user: enrollment.user,
    });

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { payment_ref: payment.token },
    });

    return {
      enrollment,
      snapToken: payment.token,
    };
  }

  return { enrollment };
};

export const getUserEnrollments = async (userId) => {
  return prisma.enrollment.findMany({
    where: { user_id: userId, payment_status: 'PAID' },
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

  // 1. Validasi batch
  if (batchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });

    if (!batch) throwError('Batch not found', 404);
  }

  // 2. Search user
  const userWhere = keyword
    ? {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { email: { contains: keyword, mode: 'insensitive' } },
        ],
      }
    : {};

  const now = new Date();

  // 3. Base filter
  const enrollmentWhere = {
    ...(batchId && { batch_id: batchId }),
    ...(keyword && { user: userWhere }),
  };

  // 4. Filter: payment_status langsung
  if (query.payment_status) {
    enrollmentWhere.payment_status = query.payment_status;
  }

  // 5. Filter: status (UI-friendly)
  if (query.status) {
    switch (query.status.toUpperCase()) {
      case 'PAID':
        enrollmentWhere.payment_status = 'PAID';
        break;

      case 'PENDING':
        enrollmentWhere.payment_status = 'PENDING';
        break;

      case 'EXPIRED':
        enrollmentWhere.payment_status = 'PENDING';
        enrollmentWhere.expires_at = { lt: now };
        break;

      case 'ACTIVE':
        enrollmentWhere.payment_status = 'PENDING';
        enrollmentWhere.expires_at = { gt: now };
        break;
    }
  }

  // 6. Filter: expired toggle
  if (query.is_expired !== undefined) {
    const isExpired = query.is_expired === 'true';

    enrollmentWhere.payment_status = 'PENDING';
    enrollmentWhere.expires_at = isExpired ? { lt: now } : { gt: now };
  }

  // 7. Filter: paid only shortcut
  if (query.paid_only === 'true') {
    enrollmentWhere.payment_status = 'PAID';
  }

  // 8. Sorting (tidak diubah)
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

  // 9. Query DB
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
    prisma.enrollment.count({ where: enrollmentWhere }),
  ]);

  // 10. SUMMARY — CEPAT (DB yang hitung)
  const [summaryRow] = await prisma.$queryRaw`
SELECT
  COUNT(*) AS total,

  COUNT(*) FILTER (
    WHERE payment_status = 'PAID'
  ) AS paid,

  COUNT(*) FILTER (
    WHERE payment_status = 'PENDING'
    AND expires_at > NOW()
  ) AS pending_active,

  COUNT(*) FILTER (
    WHERE payment_status = 'PENDING'
    AND expires_at <= NOW()
  ) AS pending_expired

FROM "Enrollment"
WHERE
  ${batchId ? Prisma.sql`batch_id = ${batchId}` : Prisma.sql`TRUE`};
`;

  const summary = {
    total: Number(summaryRow.total),
    paid: Number(summaryRow.paid),
    pending_active: Number(summaryRow.pending_active),
    pending_expired: Number(summaryRow.pending_expired),
  };

  summary.pending = summary.pending_active + summary.pending_expired;

  return {
    data: participants.map((p) => ({
      enrollment_id: p.id,
      payment_status: p.payment_status,
      expires_at: p.expires_at,
      enrolled_at: p.enrolled_at,
      user: p.user,
      batch: {
        id: p.batch.id,
        title: p.batch.title,
      },
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy: query.orderBy || 'enrolled_at',
      orderDir,
    },
    summary,
  };
};

export const getUserPayments = async (userId, query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const keyword = query.q?.trim();
  const now = new Date();

  // 🔎 Search (judul batch)
  const where = {
    user_id: userId,
    ...(keyword && {
      batch: {
        title: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
    }),
  };

  // ⭐ Filter status (UI-friendly)
  if (query.status) {
    switch (query.status.toUpperCase()) {
      case 'PAID':
        where.payment_status = 'PAID';
        break;

      case 'PENDING':
        where.payment_status = 'PENDING';
        where.expires_at = { gt: now };
        break;

      case 'EXPIRED':
        where.payment_status = 'PENDING';
        where.expires_at = { lte: now };
        break;
    }
  }

  // 🧩 Sorting
  const allowedOrderBy = {
    enrolled_at: true,
    'batch.title': true,
    payment_status: true,
    expires_at: true,
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

  // 📦 Query DB
  const [items, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        batch: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
    }),
    prisma.enrollment.count({ where }),
  ]);

  // 🎯 Mapping (biar frontend enak)
  const data = items.map((p) => {
    let status = p.payment_status;

    if (p.payment_status === 'PENDING' && p.expires_at && p.expires_at <= now) {
      status = 'EXPIRED';
    }

    return {
      enrollment_id: p.id,
      status,
      payment_status: p.payment_status,
      expires_at: p.expires_at,
      enrolled_at: p.enrolled_at,
      batch: p.batch,
    };
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy: orderField,
      orderDir,
    },
  };
};

export const getInvoiceData = async (userId, enrollmentId) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      user_id: userId,
      payment_status: 'PAID',
    },
    select: {
      id: true,
      enrolled_at: true,
      payment_status: true,
      user: {
        select: {
          name: true,
          email: true,
          phone_number: true,
        },
      },
      batch: {
        select: {
          id: true,
          title: true,
          price: true,
        },
      },
    },
  });

  if (!enrollment) {
    throwError('Invoice not found', 404);
  }

  return {
    invoice_number: `INV-${enrollment.id}`,
    issued_at: enrollment.enrolled_at,
    status: enrollment.payment_status,
    customer: enrollment.user,
    batch: enrollment.batch,
    total: enrollment.batch.price,
  };
};
