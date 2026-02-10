import { throwError } from './throwError.js';

const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throwError(`Missing environment variable: ${key}`);
  }
  return value;
};

export const MIDTRANS = {
  serverKey: getEnv('MIDTRANS_SERVER_KEY'),
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
};
