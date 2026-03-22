import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { officerMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';

const router = Router();

// GET /api/users/list
router.get('/list', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const users = await db.collection('users')
            .find(
                { role: 'user' },
                { 
                    projection: { 
                        password_hash: 0,
                        created_at: 0,
                        updated_at: 0
                    } 
                }
            )
            .toArray();

        res.json(users);
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
