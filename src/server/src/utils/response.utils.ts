import { Response } from 'express';

export const successResponse = (res: Response, data: any, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res: Response, error: string | Error, status = 400) => {
  return res.status(status).json({
    success: false,
    error: typeof error === 'string' ? error : error.message,
    timestamp: new Date().toISOString()
  });
};
