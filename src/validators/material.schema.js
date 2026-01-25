import { z } from 'zod';

export const createMaterialSchema = z.object({
    title: z.string().min(3),
    content: z.string().min(10), // Markdown content
    batch_id: z.number().int().positive(),
    order: z.number().int().nonnegative(),
});

export const updateMaterialSchema = z.object({
    title: z.string().min(3).optional(),
    content: z.string().min(10).optional(),
    order: z.number().int().nonnegative().optional(),
});
