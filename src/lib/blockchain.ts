import { ethers } from 'ethers';

// ABI for WasteCoin contract (only the functions we need)
export const WASTE_COIN_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function mintCoins(address to, uint256 amount, string reason)',
    'event CoinsMinted(address indexed to, uint256 amount, string reason)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
];

const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/';
const CONTRACT_ADDRESS = process.env.WASTE_COIN_CONTRACT_ADDRESS || '';
const OFFICER_PRIVATE_KEY = process.env.OFFICER_PRIVATE_KEY || '';

/**
 * Get Ethereum provider for Sepolia testnet
 */
export function getProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Get WasteCoin contract instance (read-only)
 */
export function getContract(): ethers.Contract {
    const provider = getProvider();
    return new ethers.Contract(CONTRACT_ADDRESS, WASTE_COIN_ABI, provider);
}

/**
 * Get WasteCoin contract instance with signer (for transactions)
 */
export function getContractWithSigner(wallet: ethers.Wallet): ethers.Contract {
    const provider = getProvider();
    const signer = wallet.connect(provider);
    return new ethers.Contract(CONTRACT_ADDRESS, WASTE_COIN_ABI, signer);
}

/**
 * Get officer wallet for minting coins
 */
export function getOfficerWallet(): ethers.Wallet {
    if (!OFFICER_PRIVATE_KEY) {
        throw new Error('OFFICER_PRIVATE_KEY not configured');
    }
    const provider = getProvider();
    return new ethers.Wallet(OFFICER_PRIVATE_KEY, provider);
}

/**
 * Get wallet balance in WST tokens
 */
export async function getWalletBalance(address: string): Promise<string> {
    const contract = getContract();
    const balance = await contract.balanceOf(address);
    return ethers.formatEther(balance);
}

/**
 * Mint coins to a user (officer only)
 */
export async function mintCoins(
    toAddress: string,
    amount: number,
    reason: string
): Promise<{ txHash: string; amount: string }> {
    const officerWallet = getOfficerWallet();
    const contract = getContractWithSigner(officerWallet);

    // Convert amount to wei (18 decimals)
    const amountInWei = ethers.parseEther(amount.toString());

    // Send transaction
    const tx = await contract.mintCoins(toAddress, amountInWei, reason);

    // Wait for confirmation
    const receipt = await tx.wait();

    return {
        txHash: receipt.hash,
        amount: amount.toString(),
    };
}

/**
 * Transfer coins from one wallet to another
 */
export async function transferCoins(
    fromWallet: ethers.Wallet,
    toAddress: string,
    amount: number
): Promise<{ txHash: string }> {
    const contract = getContractWithSigner(fromWallet);

    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount.toString());

    // Send transaction
    const tx = await contract.transfer(toAddress, amountInWei);

    // Wait for confirmation
    const receipt = await tx.wait();

    return {
        txHash: receipt.hash,
    };
}
