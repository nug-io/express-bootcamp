import prisma from '../config/db.js';
import { throwError } from '../utils/throwError.js';
import { parseId } from '../utils/parseId.js';

export const getMentors = async (query = {}) => {
  const { page, limit, keyword, orderBy, orderDir, mode } =
    normalizeMentorQuery(query);

  const skip = (page - 1) * limit;

  const filters = [];

  filters.push({ is_active: true });

  if (keyword) {
    filters.push({
      name: {
        contains: keyword,
        mode: 'insensitive',
      },
    });
  }

  const where = filters.length ? { AND: filters } : {};

  const [mentors, total] = await Promise.all([
    prisma.mentorProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderBy]: orderDir },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    prisma.mentorProfile.count({ where }),
  ]);

  if (mode === 'summary') {
    const summary = await prisma.mentorProfile.count({
      where: { is_active: true },
    });

    return { summary };
  }

  const queryInfo = {
    sorting: ['created_at', 'name'],
    pagination: {
      pageParam: 'page',
      limitParam: 'limit',
      maxLimit: 100,
    },
  };

  return {
    data: mentors,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orderBy,
      orderDir,
    },
    queryInfo,
  };
};

export const getMentorById = async (id) => {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: parseId(id) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      batches: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!mentor) {
    throwError('Mentor not found', 404);
  }

  return mentor;
};

export const createMentor = async (data) => {
  const user = await prisma.user.findUnique({
    where: { id: data.user_id },
  });

  if (!user) {
    throwError('User not found', 404);
  }

  const existing = await prisma.mentorProfile.findUnique({
    where: { user_id: data.user_id },
  });

  if (existing) {
    throwError('User is already a mentor', 409);
  }

  const mentor = await prisma.mentorProfile.create({
    data: {
      user_id: data.user_id,
      name: data.name,
      bio: data.bio,
      linkedin: data.linkedin,
      github: data.github,
      website: data.website,
    },
  });

  await prisma.user.update({
    where: { id: data.user_id },
    data: { role: 'MENTOR' },
  });

  return mentor;
};

export const updateMentor = async (id, data) => {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: parseId(id) },
  });

  if (!mentor) {
    throwError('Mentor not found', 404);
  }

  return prisma.mentorProfile.update({
    where: { id: parseId(id) },
    data: {
      name: data.name,
      bio: data.bio,
      linkedin: data.linkedin,
      github: data.github,
      website: data.website,
    },
  });
};

function normalizeMentorQuery(query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);

  const keyword = query.q?.trim();

  const allowedOrderBy = ['created_at', 'name'];

  const orderBy = allowedOrderBy.includes(query.orderBy)
    ? query.orderBy
    : 'created_at';

  const orderDir = query.orderDir === 'asc' ? 'asc' : 'desc';

  const mode = query.mode === 'summary' ? 'summary' : 'list';

  return {
    page,
    limit,
    keyword,
    orderBy,
    orderDir,
    mode,
  };
}
