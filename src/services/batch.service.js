import prisma from '../config/db.js';
import { Prisma } from '@prisma/client';

import { resolveBatchStatus } from '../utils/batchStatus.js';
import { throwError } from '../utils/throwError.js';

export const getAllBatches = async (query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const keyword = query.q?.trim();

  // 1. DB-level filter
  const where = {
    ...(keyword && {
      title: {
        contains: keyword,
        mode: 'insensitive',
      },
    }),
  };

  // 2. DB-level orderBy whitelist
  const allowedOrderBy = {
    title: true,
    start_date: true,
    created_at: true,
    price: true,
  };

  const orderField = query.orderBy || 'created_at';
  const orderDir = query.orderDir === 'asc' ? 'asc' : 'desc';

  const dbOrderBy = allowedOrderBy[orderField]
    ? [{ [orderField]: orderDir }]
    : [{ created_at: 'desc' }];

  // 3. Query DB (TABLE DATA)
  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: dbOrderBy,
      include: {
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.batch.count({ where }),
  ]);

  // 4. Enrich TABLE data (untuk UI)
  let result = batches.map((batch) => {
    const enrolledCount = batch._count.enrollments;
    const remainingQuota = batch.quota - enrolledCount;

    return {
      ...batch,
      status_effective: resolveBatchStatus(batch),
      enrolled_count: enrolledCount,
      remaining_quota: remainingQuota,
      is_full: remainingQuota <= 0,
    };
  });

  // 5. App-level filter (TABLE only)
  if (query.status) {
    result = result.filter((b) => b.status_effective === query.status);
  }

  if (query.is_full !== undefined) {
    const isFull = query.is_full === 'true';
    result = result.filter((b) => b.is_full === isFull);
  }

  // 6. App-level orderBy (computed)
  if (query.orderBy === 'remaining_quota') {
    result.sort((a, b) =>
      orderDir === 'asc'
        ? a.remaining_quota - b.remaining_quota
        : b.remaining_quota - a.remaining_quota
    );
  }

  // 7. SUMMARY — CEPAT (DB yang hitung)
  const [summaryRow] = await prisma.$queryRaw`
  SELECT
    COUNT(*) FILTER (
      WHERE status = 'ACTIVE'
      AND start_date > NOW()
    ) AS open,

    COUNT(*) FILTER (
      WHERE status = 'ACTIVE'
      AND start_date <= NOW()
      AND end_date >= NOW()
    ) AS ongoing,

    COUNT(*) FILTER (
      WHERE status = 'ACTIVE'
      AND (
        SELECT COUNT(*)
        FROM "Enrollment"
        WHERE "Enrollment".batch_id = "Batch".id
      ) >= quota
    ) AS full
  FROM "Batch"
  WHERE
    ${
      keyword
        ? Prisma.sql`title ILIKE ${'%' + keyword + '%'}`
        : Prisma.sql`TRUE`
    };
`;

  const summary = {
    open: Number(summaryRow.open),
    ongoing: Number(summaryRow.ongoing),
    full: Number(summaryRow.full),
  };

  summary.active = summary.open + summary.ongoing + summary.full;

  return {
    data: result,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy: query.orderBy || 'created_at',
      orderDir,
    },
    summary,
  };
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

  // 1. Cek title unik
  const existingBatch = await prisma.batch.findUnique({
    where: { title: data.title },
    select: { id: true },
  });

  if (existingBatch) {
    throwError('Batch title already exists', 409);
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

  // 1. Cek title unik (jika title diubah)
  if (data.title && data.title !== batch.title) {
    const existingBatch = await prisma.batch.findUnique({
      where: { title: data.title },
      select: { id: true },
    });

    if (existingBatch) {
      throwError('Batch title already exists', 409);
    }
  }

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
