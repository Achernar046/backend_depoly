'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

interface TransactionRecord {
    _id: string;
    type: string;
    amount: number;
    to_address: string;
    blockchain_tx_hash: string;
    status: string;
    created_at: string;
}

export default function Dashboard() {
    const router = useRouter();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [user, setUser] = useState<any>(null);
    const [balance, setBalance] = useState('0');
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [copied, setCopied] = useState(false);

    // Redeem rewards
    const [selectedReward, setSelectedReward] = useState<string | null>(null);
    const [redeemQuantity, setRedeemQuantity] = useState('1');
    const [redeeming, setRedeeming] = useState(false);
    const [redeemMessage, setRedeemMessage] = useState('');

    const rewardOptions = [
        { id: 'bts', name: 'ค่าโดยสาร BTS', desc: 'บัตรโดยสารรถไฟฟ้า BTS 1 เที่ยว', cost: 50, icon: '🚈', color: '#10b981' },
        { id: 'mrt', name: 'ค่าโดยสาร MRT', desc: 'บัตรโดยสารรถไฟฟ้า MRT 1 เที่ยว', cost: 45, icon: '🚇', color: '#3b82f6' },
        { id: 'arl', name: 'ค่าโดยสาร ARL', desc: 'บัตรโดยสาร Airport Rail Link 1 เที่ยว', cost: 60, icon: '✈️', color: '#8b5cf6' },
        { id: 'food', name: 'คูปองอาหาร', desc: 'คูปองอาหารมูลค่า 50 บาท', cost: 100, icon: '🍜', color: '#f97316' },
        { id: 'shopping', name: 'คูปองช้อปปิ้ง', desc: 'บัตรกำนัลช้อปปิ้ง 100 บาท', cost: 200, icon: '🛍️', color: '#ec4899' },
        { id: 'donate', name: 'บริจาคเพื่อสิ่งแวดล้อม', desc: 'บริจาค WST ให้โครงการปลูกป่า', cost: 30, icon: '🌳', color: '#14b8a6' },
    ];

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/auth');
            return;
        }

        const parsed = JSON.parse(userData);
        setUser(parsed);
        fetchBalance(token);
        fetchTransactions(token);
    }, [router]);

    const fetchBalance = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/wallet/balance`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setBalance(data.balance);
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/api/transactions/history`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setTransactions(Array.isArray(data) ? data : (data.transactions || []));
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    };

    const handleRedeem = async () => {
        if (!selectedReward) {
            setRedeemMessage('error:กรุณาเลือกรางวัลที่ต้องการแลก');
            return;
        }

        const reward = rewardOptions.find(r => r.id === selectedReward);
        if (!reward) return;

        const qty = parseInt(redeemQuantity) || 1;
        const totalCost = reward.cost * qty;
        const currentBalance = parseFloat(balance);

        if (totalCost > currentBalance) {
            setRedeemMessage('error:ยอดเหรียญ WST ไม่เพียงพอ');
            return;
        }

        setRedeeming(true);
        setRedeemMessage('');

        try {
            // Simulate redemption (frontend-only for now)
            await new Promise(resolve => setTimeout(resolve, 1500));

            setRedeemMessage(`success:แลก ${reward.name} x${qty} สำเร็จ! (${totalCost} WST)`);
            setSelectedReward(null);
            setRedeemQuantity('1');
        } catch (error: any) {
            setRedeemMessage('error:' + error.message);
        } finally {
            setRedeeming(false);
        }
    };

    const handleCopyAddress = () => {
        if (user?.walletAddress) {
            navigator.clipboard.writeText(user.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} mins ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
        const diffDay = Math.floor(diffHr / 24);
        return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    const formatNumber = (n: number) => {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString();
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner}></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const confirmedTx = transactions.filter(tx => tx.status === 'confirmed');
    const pendingTx = transactions.filter(tx => tx.status === 'pending');

    return (
        <div className={styles.page}>
            {/* Top Navigation Bar */}
            <nav className={styles.topNav}>
                <div className={styles.navLeft}>
                    <div className={styles.brand}>
                        <span className={styles.brandIcon}>💰</span>
                        <span className={styles.brandName}>
                            Waste<span className={styles.brandAccent}>Coin</span>
                        </span>
                    </div>
                </div>
                <div className={styles.navRight}>
                    <button className={styles.navIconBtn} title="Notifications">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    </button>
                    <div className={styles.navDivider}></div>
                    <div className={styles.navUser}>
                        <div className={styles.navUserInfo}>
                            <span className={styles.navUserName}>{user?.name || user?.email || 'User'}</span>
                            <span className={styles.navUserRole}>MEMBER</span>
                        </div>
                        <div className={styles.navAvatar}>
                            {getInitials(user?.name || user?.email || 'U')}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div>
                    <div className={styles.breadcrumb}>
                        <span>Home</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        <span className={styles.breadcrumbActive}>Dashboard</span>
                    </div>
                    <h1 className={styles.pageTitle}>My Dashboard</h1>
                    <p className={styles.pageSubtitle}>
                        ดูยอดเหรียญ, ส่งข้อมูลขยะ และติดตามประวัติธุรกรรมของคุณ
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.btnOutline} onClick={handleLogout}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIconBox} ${styles.statIconPurple}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Wallet Balance</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{formatNumber(parseFloat(balance))}</span>
                            <span className={styles.statUnit}>WST</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconBox} ${styles.statIconBlue}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Total Transactions</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{transactions.length}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconBox} ${styles.statIconGreen}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Confirmed</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{confirmedTx.length}</span>
                            {pendingTx.length > 0 && (
                                <span className={styles.statUnit}>{pendingTx.length} pending</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainGrid}>
                {/* Left: Wallet Panel */}
                <div className={styles.walletPanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>My Wallet</h2>
                        <span className={styles.walletBadge}>
                            <span className={styles.walletDot}></span>
                            ACTIVE
                        </span>
                    </div>

                    <div className={styles.balanceSection}>
                        <div className={styles.balanceAmount}>
                            {loading ? '...' : parseFloat(balance).toLocaleString()}
                        </div>
                        <div className={styles.balanceUnit}>WST</div>
                    </div>

                    <div className={styles.walletAddressSection}>
                        <label className={styles.fieldLabel}>Wallet Address</label>
                        <div className={styles.addressBox}>
                            <span className={styles.addressText}>
                                {user?.walletAddress || 'N/A'}
                            </span>
                            <button
                                className={styles.copyBtn}
                                onClick={handleCopyAddress}
                                title="Copy address"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                        </div>
                        {copied && (
                            <div className={styles.copiedToast}>✓ Copied!</div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className={styles.quickLinks}>
                        <div className={styles.quickLink}>
                            <div className={`${styles.quickLinkIcon} ${styles.quickLinkIconGreen}`}>🎁</div>
                            <div className={styles.quickLinkInfo}>
                                <div className={styles.quickLinkTitle}>Redeem Rewards</div>
                                <div className={styles.quickLinkDesc}>แลกเหรียญเป็นรางวัล</div>
                            </div>
                        </div>
                        <div className={styles.quickLink}>
                            <div className={`${styles.quickLinkIcon} ${styles.quickLinkIconBlue}`}>📊</div>
                            <div className={styles.quickLinkInfo}>
                                <div className={styles.quickLinkTitle}>View History</div>
                                <div className={styles.quickLinkDesc}>{transactions.length} transactions</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Redeem Rewards + Transactions */}
                <div className={styles.rightArea}>
                    {/* Redeem Rewards Panel */}
                    <div className={styles.submitPanel}>
                        <div className={styles.submitPanelHeader}>
                            <h2 className={styles.panelTitle}>แลกรางวัล</h2>
                            <span className={styles.systemBadge}>
                                <span className={styles.systemDot}></span>
                                REDEEM
                            </span>
                        </div>
                        <p className={styles.submitSubtitle}>
                            ใช้เหรียญ WST แลกเป็นค่าโดยสารรถไฟฟ้า, คูปองอาหาร และอื่นๆ
                        </p>

                        {/* Reward Options Grid */}
                        <div className={styles.rewardGrid}>
                            {rewardOptions.map((reward) => (
                                <div
                                    key={reward.id}
                                    className={`${styles.rewardCard} ${selectedReward === reward.id ? styles.rewardCardActive : ''}`}
                                    onClick={() => { setSelectedReward(reward.id); setRedeemMessage(''); }}
                                >
                                    <div className={styles.rewardIcon} style={{ background: reward.color + '15' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{reward.icon}</span>
                                    </div>
                                    <div className={styles.rewardInfo}>
                                        <div className={styles.rewardName}>{reward.name}</div>
                                        <div className={styles.rewardDesc}>{reward.desc}</div>
                                    </div>
                                    <div className={styles.rewardCost}>
                                        <span className={styles.rewardCostValue}>{reward.cost}</span>
                                        <span className={styles.rewardCostUnit}>WST</span>
                                    </div>
                                    {selectedReward === reward.id && (
                                        <div className={styles.rewardCheck}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Quantity + Redeem */}
                        {selectedReward && (
                            <div className={styles.redeemActions}>
                                <div className={styles.redeemRow}>
                                    <div className={styles.quantityGroup}>
                                        <label className={styles.fieldLabel}>จำนวน</label>
                                        <div className={styles.quantityInput}>
                                            <button
                                                type="button"
                                                className={styles.quantityBtn}
                                                onClick={() => setRedeemQuantity(String(Math.max(1, parseInt(redeemQuantity) - 1)))}
                                            >−</button>
                                            <input
                                                type="number"
                                                className={styles.quantityValue}
                                                value={redeemQuantity}
                                                onChange={(e) => setRedeemQuantity(e.target.value)}
                                                min="1"
                                                max="10"
                                            />
                                            <button
                                                type="button"
                                                className={styles.quantityBtn}
                                                onClick={() => setRedeemQuantity(String(Math.min(10, parseInt(redeemQuantity) + 1)))}
                                            >+</button>
                                        </div>
                                    </div>
                                    <div className={styles.totalCost}>
                                        <span className={styles.fieldLabel}>รวม</span>
                                        <span className={styles.totalCostValue}>
                                            {(rewardOptions.find(r => r.id === selectedReward)?.cost || 0) * (parseInt(redeemQuantity) || 1)} WST
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {redeemMessage && (
                            <div className={redeemMessage.startsWith('success:') ? styles.successMsg : styles.errorMsg}>
                                {redeemMessage.replace(/^(success:|error:)/, '')}
                            </div>
                        )}

                        <div className={styles.formActions}>
                            <button
                                type="button"
                                className={styles.btnCancel}
                                onClick={() => { setSelectedReward(null); setRedeemQuantity('1'); setRedeemMessage(''); }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                className={styles.btnConfirm}
                                disabled={redeeming || !selectedReward}
                                onClick={handleRedeem}
                            >
                                {redeeming ? (
                                    <>
                                        <span className={styles.btnSpinner}></span>
                                        กำลังแลก...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                                        แลกรางวัล
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className={styles.transactionsPanel}>
                        <div className={styles.transactionsPanelHeader}>
                            <h2 className={styles.panelTitle}>Recent Transactions</h2>
                            <span className={styles.countBadge}>{transactions.length}</span>
                        </div>
                        <div className={styles.txTable}>
                            <div className={styles.txHeaderRow}>
                                <span className={styles.txHeaderCell}>STATUS</span>
                                <span className={styles.txHeaderCell}>TYPE</span>
                                <span className={styles.txHeaderCell}>AMOUNT</span>
                                <span className={styles.txHeaderCell}>DATE</span>
                            </div>
                            {transactions.length === 0 ? (
                                <div className={styles.noTx}>No transactions yet — submit waste to earn WST!</div>
                            ) : (
                                transactions.slice(0, 10).map((tx) => (
                                    <div key={tx._id} className={styles.txRow}>
                                        <span className={styles.txCell}>
                                            <span className={`${styles.txStatus} ${tx.status === 'confirmed' ? styles.txStatusCompleted : styles.txStatusPending}`}>
                                                {tx.status === 'confirmed' ? 'Completed' : 'Pending'}
                                            </span>
                                        </span>
                                        <span className={styles.txCell}>
                                            <div className={styles.txType}>
                                                <div className={styles.txIcon}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                                                </div>
                                                <span>{tx.type === 'distribution' ? 'Reward' : tx.type}</span>
                                            </div>
                                        </span>
                                        <span className={styles.txCell}>
                                            <span className={styles.txAmount}>+ {tx.amount.toLocaleString()} WST</span>
                                        </span>
                                        <span className={`${styles.txCell} ${styles.txDate}`}>
                                            {formatTimeAgo(tx.created_at)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
