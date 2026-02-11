import * as materialService from '../services/material.service.js';

export const getBatchMaterials = async (req, res, next) => {
  try {
    const materials = await materialService.getMaterialsByBatchId(
      req.params.batchId,
      req.user.id,
      req.user.role
    );
    res.json({ data: materials });
  } catch (error) {
    next(error);
  }
};

export const getMaterialById = async (req, res, next) => {
  try {
    const material = await materialService.getMaterialById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    res.json({ data: material });
  } catch (error) {
    next(error);
  }
};

export const createMaterial = async (req, res, next) => {
  try {
    const material = await materialService.createMaterial(req.body);
    res.status(201).json({
      message: 'Material created successfully',
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMaterial = async (req, res, next) => {
  try {
    const material = await materialService.updateMaterial(
      req.params.id,
      req.body
    );
    res.json({
      message: 'Material updated successfully',
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMaterial = async (req, res, next) => {
  try {
    await materialService.deleteMaterial(req.params.id);
    res.json({
      message: 'Material deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
