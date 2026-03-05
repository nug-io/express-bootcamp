import { z } from 'zod';

const dateSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    return new Date(val);
  }
  return val;
}, z.date());

export const createBatchSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10).optional(),
  type: z.enum(['LIVE', 'COURSE']).optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  quota: z.number().int().positive().optional(),
  price: z.number().positive(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'CLOSED']).optional(),
});

export const updateBatchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  type: z.enum(['LIVE', 'COURSE']).optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  price: z.number().positive().optional(),
  quota: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'CLOSED']).optional(),
});
