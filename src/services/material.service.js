import prisma from '../config/db.js';

export const getMaterialsByBatchId = async (batchId, userId, userRole) => {
    // If not admin, check enrollment
    if (userRole !== 'ADMIN') {
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                user_id_batch_id: {
                    user_id: userId,
                    batch_id: parseInt(batchId),
                },
            },
        });

        if (!enrollment) {
            const error = new Error('You are not enrolled in this batch');
            error.status = 403;
            throw error;
        }
    }

    return prisma.material.findMany({
        where: { batch_id: parseInt(batchId) },
        orderBy: { order: 'asc' },
    });
};

export const createMaterial = async (data) => {
    // Check if batch exists
    const batch = await prisma.batch.findUnique({
        where: { id: data.batch_id },
    });

    if (!batch) {
        const error = new Error('Batch not found');
        error.status = 404;
        throw error;
    }

    return prisma.material.create({
        data,
    });
};

export const updateMaterial = async (id, data) => {
    const material = await prisma.material.findUnique({
        where: { id: parseInt(id) },
    });

    if (!material) {
        const error = new Error('Material not found');
        error.status = 404;
        throw error;
    }

    return prisma.material.update({
        where: { id: parseInt(id) },
        data,
    });
};

export const deleteMaterial = async (id) => {
    const material = await prisma.material.findUnique({
        where: { id: parseInt(id) },
    });

    if (!material) {
        const error = new Error('Material not found');
        error.status = 404;
        throw error;
    }

    return prisma.material.delete({
        where: { id: parseInt(id) },
    });
};
