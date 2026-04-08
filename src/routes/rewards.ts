import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { authMiddleware, officerMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { Reward, RedemptionHistory, Transaction, Notification } from '../models/types';
import { ObjectId } from 'mongodb';
import { getOfficerWallet, transferCoins } from '../lib/blockchain';
import { getUserWalletSigner } from '../lib/wallet';
import { isValidObjectId, parseNonNegativeInteger, parsePositiveNumber, sanitizeString } from '../lib/validation';

const router = Router();

// GET /api/rewards/list
router.get('/list', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const rewards = await db.collection<Reward>('rewards').find({ stock: { $gt: 0 } }).toArray();
        res.json(rewards);
    } catch (error) {
        console.error('Fetch rewards error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/rewards/redeem
router.post('/redeem', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const rewardId = req.body.reward_id;

        if (!rewardId) {
            return res.status(400).json({ error: 'Reward ID is required' });
        }

        if (!isValidObjectId(rewardId)) {
            return res.status(400).json({ error: 'Invalid reward ID' });
        }

        const db = await getDatabase();
        const reward = await db.collection<Reward>('rewards').findOne({ _id: new ObjectId(rewardId) });

        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        if (reward.stock <= 0) {
            return res.status(400).json({ error: 'Reward out of stock' });
        }

        const userSigner = await getUserWalletSigner(req.user!.userId);
        const officerWallet = getOfficerWallet();

        const stockReservation = await db.collection<Reward>('rewards').updateOne(
            { _id: reward._id, stock: { $gt: 0 } },
            { $inc: { stock: -1 }, $set: { updated_at: new Date() } }
        );

        if (stockReservation.matchedCount === 0) {
            return res.status(400).json({ error: 'Reward out of stock' });
        }

        let txHash: string;
        try {
            ({ txHash } = await transferCoins(userSigner, officerWallet.address, reward.coin_price));
        } catch (error) {
            await db.collection<Reward>('rewards').updateOne(
                { _id: reward._id },
                { $inc: { stock: 1 }, $set: { updated_at: new Date() } }
            );
            throw error;
        }

        const redemption: RedemptionHistory = {
            user_id: new ObjectId(req.user!.userId),
            reward_id: reward._id!,
            reward_name: reward.name,
            coin_price: reward.coin_price,
            status: 'pending',
            blockchain_tx_hash: txHash,
            created_at: new Date(),
            updated_at: new Date(),
        };

        await db.collection<RedemptionHistory>('redemption_history').insertOne(redemption);

        const transaction: Transaction = {
            user_id: new ObjectId(req.user!.userId),
            type: 'exchange',
            amount: reward.coin_price,
            to_address: officerWallet.address,
            blockchain_tx_hash: txHash,
            status: 'confirmed',
            created_at: new Date(),
        };

        await db.collection<Transaction>('transactions').insertOne(transaction);

        const notification: Notification = {
            user_id: new ObjectId(req.user!.userId),
            title: '\u0e41\u0e25\u0e01\u0e23\u0e32\u0e07\u0e27\u0e31\u0e25\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08!',
            message: `\u0e04\u0e38\u0e13\u0e44\u0e14\u0e49\u0e41\u0e25\u0e01 ${reward.name} \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27`,
            type: 'success',
            is_read: false,
            created_at: new Date(),
        };

        await db.collection<Notification>('notifications').insertOne(notification);

        res.json({
            message: 'Redemption successful',
            redemption: {
                reward_name: reward.name,
                txHash,
            },
        });
    } catch (error) {
        console.error('Redeem reward error:', error);
        res.status(500).json({ error: 'Redemption failed' });
    }
});

// GET /api/rewards/history
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const db = await getDatabase();
        const history = await db.collection<RedemptionHistory>('redemption_history')
            .find({ user_id: new ObjectId(req.user!.userId) })
            .sort({ created_at: -1 })
            .toArray();

        res.json(history);
    } catch (error) {
        console.error('Fetch redemption history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/rewards/add
router.post('/add', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const name = sanitizeString(req.body.name, 120);
        const description = sanitizeString(req.body.description, 1000) ?? '';
        const imageUrl = sanitizeString(req.body.image_url, 2048) ?? '';
        const category = sanitizeString(req.body.category, 80);
        const parsedCoinPrice = parsePositiveNumber(req.body.coin_price);
        const parsedStock = parseNonNegativeInteger(req.body.stock);

        if (!name || parsedCoinPrice === null || parsedStock === null) {
            return res.status(400).json({ error: 'Name, coin price, and stock are required' });
        }

        const db = await getDatabase();
        const newReward: Reward = {
            name,
            description,
            image_url: imageUrl,
            coin_price: parsedCoinPrice,
            stock: parsedStock,
            category,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const result = await db.collection<Reward>('rewards').insertOne(newReward);

        res.status(201).json({
            message: 'Reward added successfully',
            reward: {
                id: result.insertedId,
                ...newReward
            }
        });
    } catch (error) {
        console.error('Add reward error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/rewards/update/:id
router.put('/update/:id', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body as Record<string, unknown>;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid reward ID' });
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date(),
        };

        if (updates.name !== undefined) {
            const name = sanitizeString(updates.name, 120);
            if (!name) {
                return res.status(400).json({ error: 'Name must not be empty' });
            }
            updateData.name = name;
        }

        if (updates.description !== undefined) {
            updateData.description = sanitizeString(updates.description, 1000) ?? '';
        }

        if (updates.image_url !== undefined) {
            updateData.image_url = sanitizeString(updates.image_url, 2048) ?? '';
        }

        if (updates.category !== undefined) {
            updateData.category = sanitizeString(updates.category, 80);
        }

        if (updates.coin_price !== undefined) {
            const parsedCoinPrice = parsePositiveNumber(updates.coin_price);
            if (parsedCoinPrice === null) {
                return res.status(400).json({ error: 'Coin price must be greater than 0' });
            }
            updateData.coin_price = parsedCoinPrice;
        }

        if (updates.stock !== undefined) {
            const parsedStock = parseNonNegativeInteger(updates.stock);
            if (parsedStock === null) {
                return res.status(400).json({ error: 'Stock must be a non-negative integer' });
            }
            updateData.stock = parsedStock;
        }

        const db = await getDatabase();
        const result = await db.collection<Reward>('rewards').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        res.json({ message: 'Reward updated successfully' });
    } catch (error) {
        console.error('Update reward error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/rewards/delete/:id
router.delete('/delete/:id', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid reward ID' });
        }

        const db = await getDatabase();
        const result = await db.collection<Reward>('rewards').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        res.json({ message: 'Reward deleted successfully' });
    } catch (error) {
        console.error('Delete reward error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
