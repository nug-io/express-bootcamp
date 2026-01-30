import * as batchService from '../services/batch.service.js';

export const getBatches = async (req, res, next) => {
    try {
        const batches = await batchService.getAllBatches();
        res.json(batches);
    } catch (error) {
        next(error);
    }
};

export const getBatch = async (req, res, next) => {
    try {
        const batch = await batchService.getBatchById(req.params.id);
        res.json({ data: batch });
    } catch (error) {
        next(error);
    }
};

export const createBatch = async (req, res, next) => {
    try {
        const batch = await batchService.createBatch(req.body);
        res.status(201).json({
            message: 'Batch created successfully',
            data: batch,
        });
    } catch (error) {
        next(error);
    }
};

export const updateBatch = async (req, res, next) => {
    try {
        const batch = await batchService.updateBatch(req.params.id, req.body);
        res.json({
            message: 'Batch updated successfully',
            data: batch,
        });
    } catch (error) {
        next(error);
    }
};
