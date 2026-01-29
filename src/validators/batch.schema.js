import { z } from 'zod';

const dateSchema = z.preprocess((val) => {
    if (typeof val === 'string') {
        return new Date(val)
    }
    return val
}, z.date())

export const createBatchSchema = z.object({
    title: z.string().min(3),
    start_date: dateSchema,
    end_date: dateSchema,
    price: z.number().positive(),
    status: z.enum(['ACTIVE', 'CLOSED']).optional(),
});

export const updateBatchSchema = z.object({
    title: z.string().min(3).optional(),
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    price: z.number().positive().optional(),
    status: z.enum(['ACTIVE', 'CLOSED']).optional(),
});
