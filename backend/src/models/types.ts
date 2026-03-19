import { ObjectId } from 'mongodb';

export interface User {
    _id?: ObjectId;
    user_id: string;        // ID user (unique identifier)
    name: string;           // User's full name
    email: string;
    password_hash: string;
    role: 'user' | 'officer';
    wallet_address: string;
    created_at: Date;
    updated_at: Date;
}

export interface Wallet {
    _id?: ObjectId;
    user_id: ObjectId;
    address: string;
    encrypted_private_key: string;
    encryption_iv: string;
    created_at: Date;
}

export interface WasteSubmission {
    _id?: ObjectId;
    user_id: ObjectId;
    waste_type: string;
    weight_kg: number;
    image_url?: string;
    description?: string;
    status: 'pending' | 'approved' | 'rejected';
    coin_amount?: number;
    reviewed_by?: ObjectId;
    reviewed_at?: Date;
    blockchain_tx_hash?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Transaction {
    _id?: ObjectId;
    user_id: ObjectId;
    type: 'mint' | 'transfer' | 'exchange';
    amount: number;
    from_address?: string;
    to_address?: string;
    blockchain_tx_hash: string;
    waste_submission_id?: ObjectId;
    status: 'pending' | 'confirmed' | 'failed';
    created_at: Date;
}
