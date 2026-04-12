import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  tenantId?: string | null;
  tenantSlug?: string | null;
  isSuperAdmin?: boolean;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  tenantId?: string | null;
  tenantSlug?: string | null;
  isSuperAdmin?: boolean;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true, isSuperAdmin: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Attach user info
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Attach tenant context from JWT
    req.tenantId = decoded.tenantId || null;
    req.tenantSlug = decoded.tenantSlug || null;
    req.isSuperAdmin = decoded.isSuperAdmin || user.isSuperAdmin || false;

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

export const isManagerOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: Manager or Admin required' });
  }
  next();
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin required' });
  }
  next();
};

export const isTechnicianOrHigher = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !['technician', 'manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
