import { Router, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { authMiddleware, AuthenticatedRequest } from '../lib/auth-middleware';
import { Reward, RedemptionHistory, Transaction, Notification } from '../models/types';
import { ObjectId } from 'mongodb';
import { getOfficerWallet, transferCoins } from '../lib/blockchain';
import { getUserWalletSigner } from '../lib/wallet';

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
        const { reward_id } = req.body;

        if (!reward_id) {
            return res.status(400).json({ error: 'Reward ID is required' });
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
        
        // Blockchain transaction
        const { txHash } = await transferCoins(userSigner, officerWallet.address, reward.coin_price);

        // Deduct stock
        await db.collection<Reward>('rewards').updateOne(
            { _id: reward._id },
            { $inc: { stock: -1 }, $set: { updated_at: new Date() } }
        );

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

export default router;
