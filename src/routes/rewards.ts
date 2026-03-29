import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { authMiddleware, officerMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { Reward, RedemptionHistory, Transaction, Notification } from '../models/types';
import { ObjectId } from 'mongodb';
import { getOfficerWallet, transferCoins } from '../lib/blockchain';
import { getUserWalletSigner } from '../lib/wallet';

const router = Router();

function isValidObjectId(value: string): boolean {
    return ObjectId.isValid(value);
}

function parsePositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

// --- Public/User Endpoints ---

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
        const { reward_id } = req.body;

        if (!reward_id) {
            return res.status(400).json({ error: 'Reward ID is required' });
        }

        if (!isValidObjectId(reward_id)) {
            return res.status(400).json({ error: 'Invalid reward ID' });
        }

        const db = await getDatabase();
        const reward = await db.collection<Reward>('rewards').findOne({ _id: new ObjectId(reward_id) });

        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        if (reward.stock <= 0) {
            return res.status(400).json({ error: 'Reward out of stock' });
        }

        // Get user wallet signer and transfer coins to officer (organization)
        const userSigner = await getUserWalletSigner(req.user!.userId);
        const officerWallet = getOfficerWallet();

        // Reserve stock atomically to avoid overselling on concurrent redemptions.
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

        // Record redemption history
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

        // Record transaction
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

        // Create notification
        await db.collection('notifications').insertOne({
            user_id: new ObjectId(req.user!.userId),
            title: 'แลกรางวัลสำเร็จ!',
            message: `คุณได้แลก ${reward.name} เรียบร้อยแล้ว`,
            type: 'success',
            is_read: false,
            created_at: new Date(),
        });

        res.json({
            message: 'Redemption successful',
            redemption: {
                reward_name: reward.name,
                txHash,
            },
        });
    } catch (error) {
        console.error('Redeem reward error:', error);
        res.status(500).json({ error: 'Redemption failed: ' + (error as Error).message });
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

// --- Officer Management Endpoints ---

// POST /api/rewards/add
router.post('/add', officerMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, description, image_url, coin_price, stock, category } = req.body;

        if (!name || !coin_price || stock === undefined) {
            return res.status(400).json({ error: 'Name, coin price, and stock are required' });
        }

        const parsedCoinPrice = parsePositiveNumber(coin_price);
        const parsedStock = parseNonNegativeInteger(stock);

        if (parsedCoinPrice === null) {
            return res.status(400).json({ error: 'Coin price must be greater than 0' });
        }

        if (parsedStock === null) {
            return res.status(400).json({ error: 'Stock must be a non-negative integer' });
        }

        const db = await getDatabase();
        const newReward: Reward = {
            name,
            description,
            image_url,
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
        const updates = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ error: 'Invalid reward ID' });
        }

        if (updates.coin_price !== undefined) {
            const parsedCoinPrice = parsePositiveNumber(updates.coin_price);
            if (parsedCoinPrice === null) {
                return res.status(400).json({ error: 'Coin price must be greater than 0' });
            }
            updates.coin_price = parsedCoinPrice;
        }

        if (updates.stock !== undefined) {
            const parsedStock = parseNonNegativeInteger(updates.stock);
            if (parsedStock === null) {
                return res.status(400).json({ error: 'Stock must be a non-negative integer' });
            }
            updates.stock = parsedStock;
        }
        
        updates.updated_at = new Date();

        const db = await getDatabase();
        const result = await db.collection<Reward>('rewards').updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
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
