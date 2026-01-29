import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateToken } from '../utils/token.js';
import { throwError } from '../utils/throwError.js';

export const register = async (data) => {
  const { name, email, password, phone_number } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throwError('Email already registered', 409);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: hashedPassword,
      phone_number,
      role: 'USER',
    },
  });

  const token = generateToken({ id: user.id, role: user.role });

  return { user, token };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throwError('Invalid credentials', 401);
  }

  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    throwError('Invalid credentials', 401);
  }

  const token = generateToken({ id: user.id, role: user.role });

  return { user, token };
};
