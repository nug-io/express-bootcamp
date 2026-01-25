import { z } from 'zod';

export const createBatchSchema = z.object({
    title: z.string().min(3),
    start_date: z.string().datetime(), // ISO 8601
    end_date: z.string().datetime(),
    price: z.number().positive(),
    status: z.enum(['OPEN', 'CLOSED', 'ONGOING', 'FINISHED']).optional(),
});

export const updateBatchSchema = z.object({
    title: z.string().min(3).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    price: z.number().positive().optional(),
    status: z.enum(['OPEN', 'CLOSED', 'ONGOING', 'FINISHED']).optional(),
});
