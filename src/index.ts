import express from 'express';
import cors, { CorsOptions } from 'cors';
import authRoutes from './routes/auth';
import wasteRoutes from './routes/waste';
import officerRoutes from './routes/officer';
import walletRoutes from './routes/wallet';
import transactionRoutes from './routes/transactions';
import userRoutes from './routes/users';
import appRoutes from './routes/app';
import rewardRoutes from './routes/rewards';
import notificationRoutes from './routes/notifications';
import { connectToDatabase, pingDatabase } from './lib/mongodb';
import { validateConfig } from './lib/config';

const config = validateConfig();
const app = express();

const corsOptions: CorsOptions = {
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (!config.isProduction || config.corsOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/app', appRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: config.nodeEnv,
        message: 'WasteCoin Backend is running',
    });
});

app.get('/ready', async (req, res) => {
    try {
        await pingDatabase();
        res.json({
            status: 'ready',
            database: 'ok',
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            database: 'error',
            error: (error as Error).message,
        });
    }
});

async function startServer() {
    try {
        await connectToDatabase();
        console.log('Connected to MongoDB');

        app.listen(config.port, () => {
            console.log(`Server running on http://localhost:${config.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
