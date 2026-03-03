import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten().fieldErrors });
      return;
    }
    next(error);
  }
};

export const validateRequest = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten().fieldErrors });
      return;
    }
    next(error);
  }
};
