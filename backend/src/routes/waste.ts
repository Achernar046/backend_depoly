import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { authMiddleware, officerMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { WasteSubmission, Transaction, User } from '../models/types';
import { ObjectId } from 'mongodb';
import { mintCoins } from '../lib/blockchain';

const router = Router();

// POST /api/waste/submit
router.post('/submit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { waste_type, weight_kg, description, image_url } = req.body;

        if (!waste_type || !weight_kg) {
            return res.status(400).json({ error: 'Waste type and weight are required' });
        }

        if (weight_kg <= 0) {
            return res.status(400).json({ error: 'Weight must be greater than 0' });
        }

        const db = await getDatabase();

        const submission: WasteSubmission = {
            user_id: new ObjectId(req.user!.userId),
            waste_type,
            weight_kg: parseFloat(weight_kg),
            description,
            image_url,
            status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
        };

        const result = await db.collection<WasteSubmission>('waste_submissions').insertOne(submission);

        res.status(201).json({
            message: 'Waste submission created successfully',
            submission: {
                id: result.insertedId,
                ...submission,
            },
        });
    } catch (error) {
        console.error('Waste submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/waste/pending
router.get('/pending', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const pendingSubmissions = await db.collection('waste_submissions')
            .aggregate([
                { $match: { status: 'pending' } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                { $sort: { created_at: -1 } }
            ]).toArray();

        res.json(pendingSubmissions);
    } catch (error) {
        console.error('Fetch pending submissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/waste/approve
router.post('/approve', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { submission_id, coin_amount } = req.body;

        if (!submission_id || !coin_amount) {
            return res.status(400).json({ error: 'Submission ID and coin amount are required' });
        }

        if (coin_amount <= 0) {
            return res.status(400).json({ error: 'Coin amount must be greater than 0' });
        }

        const db = await getDatabase();
        const submission = await db.collection<WasteSubmission>('waste_submissions')
            .findOne({ _id: new ObjectId(submission_id) });

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        if (submission.status !== 'pending') {
            return res.status(400).json({ error: 'Submission already processed' });
        }

        const user = await db.collection<User>('users').findOne({ _id: submission.user_id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { txHash } = await mintCoins(
            user.wallet_address,
            coin_amount,
            `Waste submission ${submission_id}`
        );

        await db.collection<WasteSubmission>('waste_submissions').updateOne(
            { _id: new ObjectId(submission_id) },
            {
                $set: {
                    status: 'approved',
                    coin_amount,
                    reviewed_by: new ObjectId(req.user!.userId),
                    reviewed_at: new Date(),
                    blockchain_tx_hash: txHash,
                    updated_at: new Date(),
                },
            }
        );

        const transaction: Transaction = {
            user_id: submission.user_id,
            type: 'mint',
            amount: coin_amount,
            to_address: user.wallet_address,
            blockchain_tx_hash: txHash,
            waste_submission_id: new ObjectId(submission_id),
            status: 'confirmed',
            created_at: new Date(),
        };

        await db.collection<Transaction>('transactions').insertOne(transaction);

        res.json({
            message: 'Submission approved and coins minted',
            txHash,
            coin_amount,
        });
    } catch (error) {
        console.error('Approve submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
