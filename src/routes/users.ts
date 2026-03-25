import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { officerMiddleware, authMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { ObjectId } from 'mongodb';
import { User } from '../models/types';

const router = Router();

// GET /api/users/profile
router.get('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const user = await db.collection<User>('users').findOne(
            { _id: new ObjectId(req.user!.userId) },
            { 
                projection: { 
                    password_hash: 0,
                } 
            }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Fetch profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, profile_image, phone_number } = req.body;
        const db = await getDatabase();

        const updateData: Partial<User> = {
            updated_at: new Date()
        };

        if (name) updateData.name = name;
        if (profile_image) updateData.profile_image = profile_image;
        if (phone_number) updateData.phone_number = phone_number;

        const result = await db.collection<User>('users').updateOne(
            { _id: new ObjectId(req.user!.userId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
