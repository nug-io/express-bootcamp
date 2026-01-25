import logger from '../config/logger.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

const errorHandler = (err, req, res, next) => {
    logger.error(err);

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors,
        });
    }

    // Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'A record with this identifier already exists',
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Record not found',
            });
        }
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};

export default errorHandler;
