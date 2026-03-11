import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';
import { parseId } from '../utils/parseId.js';

export const getUsers = async (query = {}) => {
  const { page, limit, keyword, role, status, orderBy, orderDir, mode } =
    normalizeUserQuery(query);

  const skip = (page - 1) * limit;

  const filters = [];

  if (keyword) {
    filters.push({
      email: {
        contains: keyword,
        mode: 'insensitive',
      },
    });
  }

  if (role) {
    filters.push({ role });
  }

  if (status) {
    filters.push({ status });
  }

  filters.push({
    deleted_at: null,
  });

  const where = filters.length ? { AND: filters } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: orderDir },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const summary = await getUserSummary();

  if (mode === 'summary') {
    return { summary };
  }

  const queryInfo = {
    filters: {
      role: ['USER', 'ADMIN', 'MENTOR'],
      status: ['ACTIVE', 'SUSPENDED', 'BANNED'],
    },
    sorting: ['created_at', 'email'],
    pagination: {
      pageParam: 'page',
      limitParam: 'limit',
      maxLimit: 100,
    },
  };

  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy,
      orderDir,
    },
    summary,
    queryInfo,
  };
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: parseId(id) },
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  if (!user) {
    throwError('User not found', 404);
  }

  return user;
};

export const updateUserRole = async (currentAdminId, id, role) => {
  if (parseInt(id) === currentAdminId) {
    throwError('Admin cannot change own role', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: parseId(id) },
  });

  if (!user) {
    throwError('User not found', 404);
  }

  return prisma.user.update({
    where: { id: parseId(id) },
    data: { role },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
};

export const suspendUser = async (id) => {
  return prisma.user.update({
    where: { id: parseId(id) },
    data: {
      status: 'SUSPENDED',
    },
  });
};

export const banUser = async (id) => {
  return prisma.user.update({
    where: { id: parseId(id) },
    data: {
      status: 'BANNED',
      banned_at: new Date(),
    },
  });
};

export const deleteUser = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id: parseId(id) },
  });

  if (!user) {
    throwError('User not found', 404);
  }

  return prisma.user.update({
    where: { id: parseId(id) },
    data: {
      deleted_at: new Date(),
    },
  });
};

export const logAdminAction = async ({
  adminId,
  action,
  targetId,
  target,
  metadata,
}) => {
  return prisma.auditLog.create({
    data: {
      admin_id: adminId,
      action,
      target_id: targetId,
      target,
      metadata,
    },
  });
};

function normalizeUserQuery(query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);

  const keyword = query.q?.trim();

  const role = ['USER', 'ADMIN', 'MENTOR'].includes(query.role)
    ? query.role
    : undefined;

  const status = ['ACTIVE', 'SUSPENDED', 'BANNED'].includes(query.status)
    ? query.status
    : undefined;

  const allowedOrderBy = ['created_at', 'email'];

  const orderBy = allowedOrderBy.includes(query.orderBy)
    ? query.orderBy
    : 'created_at';

  const orderDir = query.orderDir === 'asc' ? 'asc' : 'desc';

  const mode = query.mode === 'summary' ? 'summary' : 'list';

  return {
    page,
    limit,
    keyword,
    role,
    status,
    orderBy,
    orderDir,
    mode,
  };
}

async function getUserSummary() {
  const rows = await prisma.user.groupBy({
    by: ['status'],
    _count: true,
    where: { deleted_at: null },
  });

  const summary = {
    ACTIVE: 0,
    SUSPENDED: 0,
    BANNED: 0,
  };

  rows.forEach((r) => {
    summary[r.status] = r._count;
  });

  summary.total = summary.ACTIVE + summary.SUSPENDED + summary.BANNED;

  return summary;
}
