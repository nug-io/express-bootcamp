import prisma from '../config/db.js';

export const getAllBatches = async () => {
    return prisma.batch.findMany({
        orderBy: { start_date: 'asc' },
    });
};

export const getBatchById = async (id) => {
    const batch = await prisma.batch.findUnique({
        where: { id: parseInt(id) },
        include: { materials: true },
    });

    if (!batch) {
        const error = new Error('Batch not found');
        // @ts-ignore
        error.status = 404;
        throw error;
    }

    return batch;
};

export const createBatch = async (data) => {
    return prisma.batch.create({
        data: {
            ...data,
            start_date: new Date(data.start_date),
            end_date: new Date(data.end_date),
        },
    });
};

export const updateBatch = async (id, data) => {
    // Check if batch exists
    await getBatchById(id);

    const updateData = { ...data };
    if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
    if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

    return prisma.batch.update({
        where: { id: parseInt(id) },
        data: updateData,
    });
};
