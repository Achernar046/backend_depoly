import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { officerMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { mintCoins } from '../lib/blockchain';
import { Transaction } from '../models/types';
import { ObjectId } from 'mongodb';

const router = Router();

// POST /api/officer/add-coins
router.post('/add-coins', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { user_id, amount } = req.body;
        const numericAmount = Number(amount);

        if (!user_id || !numericAmount) {
            return res.status(400).json({ error: 'User ID and amount are required' });
        }

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        const db = await getDatabase();
        const user = await db.collection('users').findOne({
            _id: new ObjectId(user_id),
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { txHash } = await mintCoins(
            user.wallet_address,
            numericAmount,
            `Officer manual mint by ${req.user!.email}`
        );

        const transaction: Transaction = {
            user_id: new ObjectId(user_id),
            type: 'mint',
            amount: numericAmount,
            to_address: user.wallet_address,
            blockchain_tx_hash: txHash,
            status: 'confirmed',
            created_at: new Date(),
        };

        const result = await db.collection<Transaction>('transactions').insertOne(transaction);

        res.status(201).json({
            message: 'Coins added successfully',
            transaction: {
                id: result.insertedId.toString(),
                amount: numericAmount,
                user: user.email,
                walletAddress: user.wallet_address,
                txHash,
            },
        });
    } catch (error) {
        console.error('Add coins error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/transactions
router.get('/transactions', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const transactions = await db.collection('transactions')
            .aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                { $sort: { created_at: -1 } },
                { $limit: 50 }
            ]).toArray();

        res.json(transactions);
    } catch (error) {
        console.error('Fetch transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/officer/rewards/report
router.get('/rewards/report', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        
        // Part 1: Inventory Status
        const inventory = await db.collection('rewards')
            .find({})
            .project({ name: 1, coin_price: 1, stock: 1 })
            .toArray();

        // Part 2: Redemption History
        const history = await db.collection('redemption_history')
            .aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        user_id: 1,
                        user_name: { $ifNull: ['$user.name', '$user.email'] },
                        reward_name: 1,
                        created_at: 1,
                        status: 1
                    }
                },
                { $sort: { created_at: -1 } }
            ]).toArray();

        res.json({
            inventory,
            history
        });
    } catch (error) {
        console.error('Fetch rewards report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
