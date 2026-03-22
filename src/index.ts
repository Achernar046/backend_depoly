import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import wasteRoutes from './routes/waste';
import officerRoutes from './routes/officer';
import walletRoutes from './routes/wallet';
import transactionRoutes from './routes/transactions';
import userRoutes from './routes/users';
import appRoutes from './routes/app';
import { connectToDatabase } from './lib/mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/app', appRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'WasteCoin Backend is running' });
});

// Start server
async function startServer() {
    try {
        await connectToDatabase();
        console.log('✅ Connected to MongoDB');
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
