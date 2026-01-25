import { z } from 'zod';

export const createEnrollmentSchema = z.object({
    batch_id: z.number().int().positive(),
});
