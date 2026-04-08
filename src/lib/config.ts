import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production';
const DEFAULT_ENCRYPTION_SECRET = 'default-secret-change-this';
const DEFAULT_RPC_URL = 'https://sepolia.infura.io/v3/';

export interface AppConfig {
    nodeEnv: string;
    isProduction: boolean;
    port: number;
    mongodbUri: string;
    mongodbDb: string;
    jwtSecret: string;
    encryptionSecret: string;
    sepoliaRpcUrl: string;
    wasteCoinContractAddress: string;
    officerPrivateKey: string;
    corsOrigins: string[];
    walletExportEnabled: boolean;
}

let cachedConfig: AppConfig | null = null;

function getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

function parsePort(value: string | undefined): number {
    const parsed = Number(value ?? '3000');
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('PORT must be a positive integer');
    }
    return parsed;
}

export function getConfig(): AppConfig {
    if (cachedConfig) {
        return cachedConfig;
    }

    const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
    const isProduction = nodeEnv === 'production';
    const corsOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    cachedConfig = {
        nodeEnv,
        isProduction,
        port: parsePort(process.env.PORT),
        mongodbUri: getRequiredEnv('MONGODB_URI'),
        mongodbDb: process.env.MONGODB_DB?.trim() || 'waste-coin-db',
        jwtSecret: getRequiredEnv('JWT_SECRET'),
        encryptionSecret: getRequiredEnv('ENCRYPTION_SECRET'),
        sepoliaRpcUrl: getRequiredEnv('SEPOLIA_RPC_URL'),
        wasteCoinContractAddress: getRequiredEnv('WASTE_COIN_CONTRACT_ADDRESS'),
        officerPrivateKey: getRequiredEnv('OFFICER_PRIVATE_KEY'),
        corsOrigins,
        walletExportEnabled: process.env.ENABLE_WALLET_EXPORT === 'true',
    };

    return cachedConfig;
}

export function validateConfig(): AppConfig {
    const config = getConfig();

    if (config.jwtSecret === DEFAULT_JWT_SECRET) {
        throw new Error('JWT_SECRET must not use the default insecure value');
    }

    if (config.encryptionSecret === DEFAULT_ENCRYPTION_SECRET) {
        throw new Error('ENCRYPTION_SECRET must not use the default insecure value');
    }

    if (config.sepoliaRpcUrl === DEFAULT_RPC_URL) {
        throw new Error('SEPOLIA_RPC_URL must not use the placeholder value');
    }

    if (config.isProduction && config.corsOrigins.length === 0) {
        throw new Error('CORS_ORIGIN must be configured in production');
    }

    return config;
}
