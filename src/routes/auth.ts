import { Router, Request, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { hashPassword, comparePassword, generateToken } from '../lib/auth';
import { generateWallet, encryptPrivateKey } from '../lib/wallet';
import { User, Wallet } from '../models/types';
import { normalizeEmail, sanitizeString } from '../lib/validation';
import { createRateLimiter } from '../lib/rate-limit';

const router = Router();
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 20);

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
    try {
        const userId = sanitizeString(req.body.user_id, 64);
        const name = sanitizeString(req.body.name, 120);
        const email = normalizeEmail(req.body.email);
        const password = typeof req.body.password === 'string' ? req.body.password : '';

        if (!userId || !name || !email || !password) {
            return res.status(400).json({ error: 'ID User, Name, Email and Password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const db = await getDatabase();

        const existingUserId = await db.collection<User>('users').findOne({ user_id: userId });
        if (existingUserId) {
            return res.status(409).json({ error: 'User ID already exists' });
        }

        const existingUser = await db.collection<User>('users').findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const password_hash = await hashPassword(password);
        const wallet = generateWallet();
        const { encryptedKey, iv } = encryptPrivateKey(wallet.privateKey);

        const user: User = {
            user_id: userId,
            name,
            email,
            password_hash,
            role: 'user',
            wallet_address: wallet.address,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const userResult = await db.collection<User>('users').insertOne(user);

        const walletDoc: Wallet = {
            user_id: userResult.insertedId,
            address: wallet.address,
            encrypted_private_key: encryptedKey,
            encryption_iv: iv,
            created_at: new Date(),
        };

        await db.collection<Wallet>('wallets').insertOne(walletDoc);

        const token = generateToken({
            userId: userResult.insertedId.toString(),
            email: user.email,
            role: user.role,
            walletAddress: user.wallet_address,
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: userResult.insertedId,
                userId: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                walletAddress: user.wallet_address,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = typeof req.body.password === 'string' ? req.body.password : '';

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = await getDatabase();
        const user = await db.collection<User>('users').findOne({ email });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await comparePassword(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken({
            userId: user._id!.toString(),
            email: user.email,
            role: user.role,
            walletAddress: user.wallet_address,
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                walletAddress: user.wallet_address,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
