import { ObjectId } from 'mongodb';
import { ethers } from 'ethers';

export function normalizeEmail(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function parsePositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseNonNegativeInteger(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function isValidObjectId(value: unknown): value is string {
    return typeof value === 'string' && ObjectId.isValid(value);
}

export function isValidEthereumAddress(value: unknown): value is string {
    return typeof value === 'string' && ethers.isAddress(value);
}

export function sanitizeString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    return trimmed.slice(0, maxLength);
}
