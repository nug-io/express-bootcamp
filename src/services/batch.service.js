import prisma from '../config/db.js';
import { Prisma } from '@prisma/client';

import { resolveBatchStatus } from '../utils/batchStatus.js';
import { throwError } from '../utils/throwError.js';

export const getAllBatches = async (query = {}) => {
  const {
    page,
    limit,
    keyword,
    type,
    tags,
    tagMode,
    status,
    isFull,
    orderBy,
    orderDir,
    mode,
  } = normalizeBatchQuery(query);

  const skip = (page - 1) * limit;

  // 1. DB-level filter
  const where = buildBatchFilters({
    keyword,
    type,
    tags,
    tagMode,
  });

  // 2. Query DB (TABLE DATA)
  const { data: batches, total } = await listQuery({
    model: prisma.batch,
    where,
    include: {
      tags: {
        include: { tag: true },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: orderDir,
    skip,
    take: limit,
  });

  // 3. Enrich TABLE data (untuk UI)
  let result = batches.map(mapBatchResult);

  // 4. App-level filter (TABLE only)
  if (status) {
    result = result.filter((b) => b.status_effective === status);
  }

  if (isFull !== undefined) {
    result = result.filter((b) => b.is_full === isFull);
  }

  // 5. App-level orderBy (computed)
  if (orderBy === 'remaining_quota') {
    result.sort((a, b) =>
      orderDir === 'asc'
        ? a.remaining_quota - b.remaining_quota
        : b.remaining_quota - a.remaining_quota
    );
  }

  // 6. SUMMARY — CEPAT (DB yang hitung)
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
      AND end_date >= NOW()
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

  const summary = buildSummary(summaryRow);

  const summaryByType = await getBatchTypeSummary();

  const summaryByTag = await getBatchTagSummary();

  if (mode === 'summary') {
    return {
      summary,
      summaryByType,
      summaryByTag,
    };
  }

  const queryInfo = buildBatchQueryInfo();

  return buildListResponse({
    data: result,
    page,
    limit,
    total,
    orderBy,
    orderDir,
    filters: {
      type: type || null,
      tags: tags || null,
      tagMode,
    },
    extras: {
      summary,
      summaryByType,
      summaryByTag,
      queryInfo,
    },
  });
};

export const getBatchById = async (id) => {
  const batch = await prisma.batch.findUnique({
    where: { id: parseInt(id) },
    include: {
      materials: true,
      tags: {
        include: {
          tag: true,
        },
      },
      mentors: {
        where: { deleted_at: null },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              bio: true,
              avatar: true,
              linkedin: true,
              github: true,
              website: true,
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!batch) {
    throwError('Batch not found', 404);
  }

  return {
    ...batch,
    tags: batch.tags?.map((t) => t.tag.name) || [],
    mentors: batch.mentors?.map((m) => m.mentor) || [],
    status_effective: resolveBatchStatus(batch),
    enrolled_count: batch._count.enrollments,
    is_full:
      batch.quota === null ? false : batch._count.enrollments >= batch.quota,
  };
};

export const createBatch = async (data) => {
  let startDate = null;
  let endDate = null;

  const type = data.type || 'LIVE';

  if (type === 'LIVE') {
    startDate = new Date(data.start_date);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(data.end_date);
    endDate.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!data.start_date || !data.end_date || !data.quota) {
      throwError('LIVE batch requires start_date, end_date and quota', 400);
    }

    if (startDate < today) {
      throwError('Batch cannot start in the past', 400);
    }

    if (endDate < startDate) {
      throwError('End date must be after start date', 400);
    }
  }

  if (type === 'COURSE') {
    data.start_date = null;
    data.end_date = null;
    data.quota = null;
  }

  const existingBatch = await prisma.batch.findUnique({
    where: { title: data.title },
    select: { id: true },
  });

  if (existingBatch) {
    throwError('Batch title already exists', 409);
  }

  const tags = data.tags || [];
  const mentors = data.mentors || [];

  const batch = await prisma.batch.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type || 'LIVE',
      start_date: startDate,
      end_date: endDate,
      price: data.price,
      quota: data.quota,
      status: 'ACTIVE',
    },
  });

  if (mentors.length) {
    await Promise.all(
      mentors.map((mentorId) =>
        prisma.batchMentor.create({
          data: {
            batch_id: batch.id,
            mentor_id: mentorId,
          },
        })
      )
    );
  }

  if (tags.length) {
    await Promise.all(
      tags.map(async (tagName) => {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        await prisma.batchTag.create({
          data: {
            batch_id: batch.id,
            tag_id: tag.id,
          },
        });
      })
    );
  }

  return {
    ...batch,
    tags,
  };
};

export const updateBatch = async (id, data) => {
  const batch = await getBatchById(id);

  const { tags, mentors, ...batchData } = data;

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
    : new Date(batch.start_date);

  const endDate = data.end_date
    ? new Date(data.end_date)
    : new Date(batch.end_date);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throwError('Batch cannot start in the past', 400);
  }

  if (endDate < startDate) {
    throwError('End date must be after start date', 400);
  }

  if (tags) {
    await prisma.batchTag.deleteMany({
      where: { batch_id: parseInt(id) },
    });

    await Promise.all(
      tags.map(async (tagName) => {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        await prisma.batchTag.create({
          data: {
            batch_id: parseInt(id),
            tag_id: tag.id,
          },
        });
      })
    );
  }

  if (mentors) {
    const batchId = parseInt(id);

    // soft delete existing
    await prisma.batchMentor.updateMany({
      where: {
        batch_id: batchId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    // insert new mentors
    await Promise.all(
      mentors.map((mentorId) =>
        prisma.batchMentor.create({
          data: {
            batch_id: batchId,
            mentor_id: mentorId,
          },
        })
      )
    );
  }

  const updated = await prisma.batch.update({
    where: { id: parseInt(id) },
    data: {
      ...batchData,
      start_date: startDate,
      end_date: endDate,
      mentors: {
        where: { deleted_at: null },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return {
    ...updated,
    tags: tags || batch.tags,
    mentors: batch.mentors?.map((m) => m.mentor) || [],
  };
};

function normalizeBatchQuery(query) {
  const mode = query.mode === 'summary' ? 'summary' : 'list';

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);

  const keyword = query.q?.trim() || undefined;

  const type = query.type
    ? query.type
        .split(',')
        .map((t) => t.trim())
        .filter((t) => ['LIVE', 'COURSE'].includes(t))
    : undefined;

  const tagMode = query.tagMode === 'and' ? 'and' : 'or';

  const tags = query.tag
    ? query.tag
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  const status = query.status || undefined;

  const isFull =
    query.is_full === 'true'
      ? true
      : query.is_full === 'false'
        ? false
        : undefined;

  const allowedOrderBy = [
    'created_at',
    'title',
    'price',
    'start_date',
    'remaining_quota',
  ];

  const orderBy = allowedOrderBy.includes(query.orderBy)
    ? query.orderBy
    : 'created_at';

  const orderDir = query.orderDir === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    keyword,
    type,
    tags,
    tagMode,
    status,
    isFull,
    orderBy,
    orderDir,
    mode,
  };
}

function mapBatchResult(batch) {
  const enrolledCount = batch._count.enrollments;

  const remainingQuota =
    batch.quota === null ? null : batch.quota - enrolledCount;

  return {
    ...batch,
    tags: batch.tags?.map((t) => t.tag.name) || [],
    status_effective: resolveBatchStatus(batch),
    enrolled_count: enrolledCount,
    remaining_quota: remainingQuota,
    is_full: batch.quota === null ? false : remainingQuota <= 0,
  };
}

function buildSummary(summaryRow) {
  const summary = {
    open: Number(summaryRow.open),
    ongoing: Number(summaryRow.ongoing),
    full: Number(summaryRow.full),
  };

  summary.active = summary.open + summary.ongoing;

  return summary;
}

async function listQuery({
  model,
  where = {},
  include = {},
  orderBy,
  skip,
  take,
}) {
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      orderBy,
      skip,
      take,
    }),
    model.count({ where }),
  ]);

  return { data, total };
}

async function getBatchTypeSummary() {
  const rows = await prisma.batch.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  const summary = {
    LIVE: 0,
    COURSE: 0,
  };

  rows.forEach((row) => {
    summary[row.type] = row._count.id;
  });

  return summary;
}

async function getBatchTagSummary() {
  const rows = await prisma.batchTag.groupBy({
    by: ['tag_id'],
    _count: { batch_id: true },
  });

  const tags = await prisma.tag.findMany({
    select: { id: true, name: true },
  });

  const summary = {};

  tags.forEach((tag) => {
    summary[tag.name] = 0;
  });

  rows.forEach((row) => {
    const tag = tags.find((t) => t.id === row.tag_id);
    if (tag) summary[tag.name] = row._count.batch_id;
  });

  return summary;
}

function buildListResponse({
  data,
  page,
  limit,
  total,
  orderBy,
  orderDir,
  filters,
  extras = {},
}) {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy,
      orderDir,
      filters,
    },
    ...extras,
  };
}

function buildBatchFilters({ keyword, type, tags, tagMode }) {
  const filters = [];

  if (keyword) {
    filters.push({
      title: {
        contains: keyword,
        mode: 'insensitive',
      },
    });
  }

  if (type?.length) {
    filters.push({
      type: { in: type },
    });
  }

  if (tags?.length) {
    if (tagMode === 'and') {
      tags.forEach((tag) => {
        filters.push({
          tags: {
            some: {
              tag: { name: tag },
            },
          },
        });
      });
    } else {
      filters.push({
        tags: {
          some: {
            tag: {
              name: { in: tags },
            },
          },
        },
      });
    }
  }

  return filters.length ? { AND: filters } : undefined;
}

function buildBatchQueryInfo() {
  return {
    filters: {
      type: ['LIVE', 'COURSE'],
      tagMode: ['or', 'and'],
      status: ['OPEN', 'ONGOING', 'FULL'],
    },
    sorting: ['created_at', 'title', 'price', 'start_date', 'remaining_quota'],
    pagination: {
      pageParam: 'page',
      limitParam: 'limit',
      maxLimit: 100,
    },
  };
}
