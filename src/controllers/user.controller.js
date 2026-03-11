import * as userService from '../services/user.service.js';
import { throwError } from '../utils/throwError.js';

export const getMe = (req, res) => {
  res.json({
    data: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers(req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  if (req.user.id === parseInt(req.params.id)) {
    throwError('You cannot change your own role', 400);
  }

  try {
    const user = await userService.updateUserRole(
      req.user.id,
      req.params.id,
      req.body.role
    );

    res.json({
      message: 'User role updated',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const suspendUser = async (req, res, next) => {
  if (req.user.id === parseInt(req.params.id)) {
    throwError('You cannot modify yourself', 400);
  }

  try {
    const user = await userService.suspendUser(req.params.id);

    await userService.logAdminAction({
      adminId: req.user.id,
      action: 'USER_SUSPENDED',
      targetId: user.id,
      target: 'USER',
    });

    res.json({
      message: 'User suspended',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const banUser = async (req, res, next) => {
  if (req.user.id === parseInt(req.params.id)) {
    throwError('You cannot modify yourself', 400);
  }

  try {
    const user = await userService.banUser(req.params.id);

    await userService.logAdminAction({
      adminId: req.user.id,
      action: 'USER_BANNED',
      targetId: user.id,
      target: 'USER',
    });

    res.json({
      message: 'User banned',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  if (req.user.id === parseInt(req.params.id)) {
    throwError('You cannot modify yourself', 400);
  }

  try {
    const user = await userService.deleteUser(req.params.id);

    await userService.logAdminAction({
      adminId: req.user.id,
      action: 'USER_DELETED',
      targetId: user.id,
      target: 'USER',
    });

    res.json({
      message: 'User deleted',
    });
  } catch (error) {
    next(error);
  }
};
