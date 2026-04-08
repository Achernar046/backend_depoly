import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { authMiddleware, officerMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { WasteSubmission, Transaction, User, Notification } from '../models/types';
import { ObjectId } from 'mongodb';
import { mintCoins } from '../lib/blockchain';
import { isValidObjectId, parsePositiveNumber, sanitizeString } from '../lib/validation';

const router = Router();

// POST /api/waste/submit
router.post('/submit', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const wasteType = sanitizeString(req.body.waste_type, 80);
        const weightKg = parsePositiveNumber(req.body.weight_kg);
        const description = sanitizeString(req.body.description, 500);
        const imageUrl = sanitizeString(req.body.image_url, 2048);

        if (!wasteType || weightKg === null) {
            return res.status(400).json({ error: 'Waste type and weight are required' });
        }

        const db = await getDatabase();

        const submission: WasteSubmission = {
            user_id: new ObjectId(req.user!.userId),
            waste_type: wasteType,
            weight_kg: weightKg,
            description,
            image_url: imageUrl,
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

// GET /api/waste/my-submissions
router.get('/my-submissions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const submissions = await db.collection<WasteSubmission>('waste_submissions')
            .find({ user_id: new ObjectId(req.user!.userId) })
            .sort({ created_at: -1 })
            .toArray();

        res.json(submissions);
    } catch (error) {
        console.error('Fetch my submissions error:', error);
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
                {
                    $project: {
                        _id: 1,
                        user_id: 1,
                        waste_type: 1,
                        weight_kg: 1,
                        description: 1,
                        image_url: 1,
                        status: 1,
                        coin_amount: 1,
                        reviewed_by: 1,
                        reviewed_at: 1,
                        blockchain_tx_hash: 1,
                        created_at: 1,
                        updated_at: 1,
                        'user._id': 1,
                        'user.user_id': 1,
                        'user.name': 1,
                        'user.email': 1,
                        'user.role': 1,
                        'user.wallet_address': 1,
                        'user.created_at': 1,
                        'user.updated_at': 1,
                    }
                },
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
        const submissionId = req.body.submission_id;
        const parsedCoinAmount = parsePositiveNumber(req.body.coin_amount);

        if (!submissionId || parsedCoinAmount === null) {
            return res.status(400).json({ error: 'Submission ID and coin amount are required' });
        }

        if (!isValidObjectId(submissionId)) {
            return res.status(400).json({ error: 'Invalid submission ID' });
        }

        const db = await getDatabase();
        const submission = await db.collection<WasteSubmission>('waste_submissions')
            .findOne({ _id: new ObjectId(submissionId) });

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
            parsedCoinAmount,
            `Waste submission ${submissionId}`
        );

        await db.collection<WasteSubmission>('waste_submissions').updateOne(
            { _id: new ObjectId(submissionId) },
            {
                $set: {
                    status: 'approved',
                    coin_amount: parsedCoinAmount,
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
            amount: parsedCoinAmount,
            to_address: user.wallet_address,
            blockchain_tx_hash: txHash,
            waste_submission_id: new ObjectId(submissionId),
            status: 'confirmed',
            created_at: new Date(),
        };

        await db.collection<Transaction>('transactions').insertOne(transaction);

        const notification: Notification = {
            user_id: submission.user_id,
            title: '\u0e01\u0e32\u0e23\u0e2a\u0e48\u0e07\u0e02\u0e22\u0e30\u0e16\u0e39\u0e01\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34!',
            message: `\u0e02\u0e22\u0e30 ${submission.waste_type} \u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e41\u0e25\u0e49\u0e27 \u0e41\u0e25\u0e30\u0e04\u0e38\u0e13\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a ${parsedCoinAmount} WST`,
            type: 'success',
            is_read: false,
            created_at: new Date(),
        };

        await db.collection<Notification>('notifications').insertOne(notification);

        res.json({
            message: 'Submission approved and coins minted',
            txHash,
            coin_amount: parsedCoinAmount,
        });
    } catch (error) {
        console.error('Approve submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
