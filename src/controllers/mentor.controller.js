import * as mentorService from '../services/mentor.service.js';

export const getMentors = async (req, res, next) => {
  try {
    const mentors = await mentorService.getMentors(req.query);
    res.json(mentors);
  } catch (error) {
    next(error);
  }
};

export const getMentor = async (req, res, next) => {
  try {
    const mentor = await mentorService.getMentorById(req.params.id);

    res.json({
      data: mentor,
    });
  } catch (error) {
    next(error);
  }
};

export const createMentor = async (req, res, next) => {
  try {
    const mentor = await mentorService.createMentor(req.body);

    res.status(201).json({
      message: 'Mentor created',
      data: mentor,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMentor = async (req, res, next) => {
  try {
    const mentor = await mentorService.updateMentor(req.params.id, req.body);

    res.json({
      message: 'Mentor updated',
      data: mentor,
    });
  } catch (error) {
    next(error);
  }
};
