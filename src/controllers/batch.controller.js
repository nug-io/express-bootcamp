import * as batchService from '../services/batch.service.js';
import * as batchMentorService from '../services/batchMentor.service.js';

export const getBatches = async (req, res, next) => {
  try {
    const batches = await batchService.getAllBatches(req.query);
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

export const getBatchMentors = async (req, res, next) => {
  try {
    const data = await batchMentorService.getBatchMentors(req.params.id);

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const addBatchMentor = async (req, res, next) => {
  try {
    const data = await batchMentorService.addBatchMentor(
      req.params.id,
      req.body.mentor_id
    );

    res.status(201).json({
      message: 'Mentor added to batch',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const removeBatchMentor = async (req, res, next) => {
  try {
    const data = await batchMentorService.removeBatchMentor(
      req.params.batchId,
      req.params.mentorId
    );

    res.json({
      message: 'Mentor removed from batch',
      data,
    });
  } catch (err) {
    next(err);
  }
};
