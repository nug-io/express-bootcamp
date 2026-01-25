import prisma from '../config/db.js';

export const enrollUser = async (userId, batchId) => {
    // Check if batch exists
    const batch = await prisma.batch.findUnique({
        where: { id: batchId },
    });

    if (!batch) {
        const error = new Error('Batch not found');
        error.status = 404;
        throw error;
    }

    if (batch.status !== 'OPEN') {
        const error = new Error('Batch is not open for enrollment');
        error.status = 400;
        throw error;
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
            user_id_batch_id: {
                user_id: userId,
                batch_id: batchId,
            },
        },
    });

    if (existingEnrollment) {
        const error = new Error('User already enrolled in this batch');
        error.status = 409;
        throw error;
    }

    return prisma.enrollment.create({
        data: {
            user_id: userId,
            batch_id: batchId,
        },
        include: {
            batch: true,
        },
    });
};

export const getUserEnrollments = async (userId) => {
    return prisma.enrollment.findMany({
        where: { user_id: userId },
        include: {
            batch: true,
        },
    });
};
