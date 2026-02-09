import * as enrollmentService from '../services/enrollment.service.js';

export const enroll = async (req, res, next) => {
  try {
    const enrollment = await enrollmentService.enrollUser(
      req.user.id,
      req.body.batch_id
    );
    res.status(201).json({
      message: 'Enrolled successfully',
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await enrollmentService.getUserEnrollments(req.user.id);
    res.json({
      data: enrollments,
    });
  } catch (error) {
    next(error);
  }
};

export const getBatchParticipants = async (req, res, next) => {
  try {
    const result = await enrollmentService.getBatchParticipants(req.query);

    res.json(result);
  } catch (error) {
    next(error);
  }
};
