import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from './auth';

export interface AuthenticatedRequest extends Request {
    user?: JWTPayload;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = decoded;
    next();
}

export function officerMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    authMiddleware(req, res, () => {
        if (req.user?.role !== 'officer') {
            return res.status(403).json({ error: 'Forbidden: Officer access only' });
        }
        next();
    });
}
