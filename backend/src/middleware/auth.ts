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
  tenantId?: string;
  tenantSlug?: string;
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
      select: { id: true, email: true, role: true, isActive: true, isSuperAdmin: true, status: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Check user status for soft-lockout
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'המשתמש מושהה. יש לפנות לתמיכה.' });
    }
    if (user.status === 'archived') {
      return res.status(403).json({ message: 'המשתמש לא פעיל. יש לפנות לתמיכה.' });
    }

    // Attach user info
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.role,
    };

    // Attach tenant context from JWT
    const isSuperAdmin = decoded.isSuperAdmin || user.isSuperAdmin || false;
    req.tenantId = decoded.tenantId || '';
    req.tenantSlug = decoded.tenantSlug || '';
    req.isSuperAdmin = isSuperAdmin;

    // Check for stale JWT: non-super-admin users must have tenantId
    if (!isSuperAdmin && !decoded.tenantId) {
      return res.status(401).json({ 
        status: 'session_expired',
        message: 'המערכת עודכנה, נא להתחבר מחדש' 
      });
    }

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

export const isSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.isSuperAdmin) {
    return res.status(403).json({ message: 'Forbidden: Super admin required' });
  }
  next();
};
