'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './officer.module.css';
import { buildApiUrl } from '../../lib/api';

interface User {
    id: string;
    userId: string;
    name: string;
    email: string;
    walletAddress: string;
    createdAt: string;
}

interface TransactionRecord {
    _id: string;
    type: string;
    amount: number;
    to_address: string;
    blockchain_tx_hash: string;
    status: string;
    created_at: string;
    user?: {
        name: string;
        email: string;
        wallet_address: string;
    };
}

export default function OfficerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [coinAmount, setCoinAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [totalDistributed, setTotalDistributed] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/auth');
            return;
        }

        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'officer') {
            router.push('/dashboard');
            return;
        }

        setUser(parsedUser);
        fetchUsers(token);
        fetchTransactions(token);
        fetchPendingCount(token);
    }, [router]);

    const fetchUsers = async (token: string) => {
        try {
            const response = await fetch(buildApiUrl('/api/users/list'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setUsers(
                    Array.isArray(data)
                        ? data.map((entry: any) => ({
                            id: entry._id,
                            userId: entry.user_id,
                            name: entry.name,
                            email: entry.email,
                            walletAddress: entry.wallet_address,
                            createdAt: entry.created_at,
                        }))
                        : []
                );
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async (token: string) => {
        try {
            const response = await fetch(buildApiUrl('/api/officer/transactions'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                const nextTransactions = Array.isArray(data) ? data : [];
                setTransactions(nextTransactions);
                setTotalDistributed(nextTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0));
            }
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        }
    };

    const fetchPendingCount = async (token: string) => {
        try {
            const response = await fetch(buildApiUrl('/api/waste/pending'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setPendingCount(Array.isArray(data) ? data.length : 0);
            }
        } catch (error) {
            console.error('Failed to fetch pending count:', error);
        }
    };

    const filteredUsers = users.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            u.userId?.toLowerCase().includes(q) ||
            u.name?.toLowerCase().includes(q) ||
            u.walletAddress?.toLowerCase().includes(q)
        );
    });

    const handleUserSelect = (u: User) => {
        setSelectedUser(u);
        setMessage('');
    };

    const handleAddCoins = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUser || !coinAmount) {
            setMessage('error:Please select a user and enter amount');
            return;
        }

        setProcessing(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(buildApiUrl('/api/officer/add-coins'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    amount: parseFloat(coinAmount),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            setMessage(`success:Successfully added ${coinAmount} WST to ${selectedUser.name}`);
            setCoinAmount('');

            // Refresh transactions
            if (token) {
                fetchTransactions(token);
                fetchPendingCount(token);
            }
        } catch (error: any) {
            setMessage('error:' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const setQuickAmount = (pct: number) => {
        const max = 10000;
        setCoinAmount(String(Math.floor(max * pct)));
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
                            <span className={styles.navUserName}>{user?.name || 'Officer'}</span>
                            <span className={styles.navUserRole}>CHIEF OFFICER</span>
                        </div>
                        <div className={styles.navAvatar}>
                            {getInitials(user?.name || 'O')}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <div className={styles.breadcrumb}>
                        <span>Dashboard</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                        <span className={styles.breadcrumbActive}>Overview</span>
                    </div>
                    <h1 className={styles.pageTitle}>Officer Dashboard</h1>
                    <p className={styles.pageSubtitle}>
                        Manage user distributions, monitor transaction stats, and oversee platform activity.
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
                    <div className={`${styles.statIconBox} ${styles.statIconBlue}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Total Users</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{formatNumber(users.length)}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconBox} ${styles.statIconPurple}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Total Distributed</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{formatNumber(totalDistributed)}</span>
                            <span className={styles.statUnit}>WST</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconBox} ${styles.statIconOrange}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Pending Requests</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{pendingCount}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconBox} ${styles.statIconGreen}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                    </div>
                    <div className={styles.statBody}>
                        <span className={styles.statLabel}>Active Wallets</span>
                        <div className={styles.statValueRow}>
                            <span className={styles.statValue}>{formatNumber(users.length)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainGrid}>
                {/* Left: Registered Users */}
                <div className={styles.usersPanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Registered Users</h2>
                        <span className={styles.countBadge}>{users.length}</span>
                    </div>
                    <div className={styles.searchBox}>
                        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search name, ID or wallet..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className={styles.userList}>
                        {filteredUsers.length === 0 ? (
                            <div className={styles.emptyList}>No users found</div>
                        ) : (
                            filteredUsers.map((u) => (
                                <div
                                    key={u.id}
                                    className={`${styles.userItem} ${selectedUser?.id === u.id ? styles.userItemActive : ''}`}
                                    onClick={() => handleUserSelect(u)}
                                >
                                    <div className={styles.userAvatar} style={{ background: selectedUser?.id === u.id ? '#1a1a2e' : undefined }}>
                                        {getInitials(u.name)}
                                    </div>
                                    <div className={styles.userInfo}>
                                        <div className={styles.userNameRow}>
                                            <span className={styles.userName}>{u.name}</span>
                                            <span className={styles.userIdBadge}>ID:{u.userId}</span>
                                        </div>
                                        <span className={styles.userWallet}>
                                            {u.walletAddress?.slice(0, 6)}...{u.walletAddress?.slice(-4)}
                                        </span>
                                    </div>
                                    {selectedUser?.id === u.id && (
                                        <div className={styles.selectArrow}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Center: Distribute Coins + Recent Transactions */}
                <div className={styles.centerArea}>
                    {/* Distribute Coins */}
                    <div className={styles.distributePanel}>
                        <div className={styles.distributePanelHeader}>
                            <h2 className={styles.panelTitle}>Distribute Coins</h2>
                            <span className={styles.systemBadge}>
                                <span className={styles.systemDot}></span>
                                SYSTEM ACTIVE
                            </span>
                        </div>
                        <p className={styles.distributeSubtitle}>
                            Select a user from the list or search below to allocate WST tokens.
                        </p>

                        <form onSubmit={handleAddCoins}>
                            {/* Recipient */}
                            <label className={styles.fieldLabel}>Recipient</label>
                            {selectedUser ? (
                                <div className={styles.recipientCard}>
                                    <div className={styles.recipientAvatar}>
                                        {getInitials(selectedUser.name)}
                                    </div>
                                    <div className={styles.recipientInfo}>
                                        <div className={styles.recipientNameRow}>
                                            <span className={styles.recipientName}>{selectedUser.name}</span>
                                            <span className={styles.verifiedBadge}>VERIFIED</span>
                                        </div>
                                        <span className={styles.recipientWallet}>
                                            {selectedUser.walletAddress?.slice(0, 6)}...{selectedUser.walletAddress?.slice(-4)}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.clearRecipient}
                                        onClick={() => setSelectedUser(null)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.noRecipient}>
                                    Click a user from the list to select recipient
                                </div>
                            )}

                            {/* Amount */}
                            <label className={styles.fieldLabel}>Amount (WST)</label>
                            <div className={styles.amountInputRow}>
                                <span className={styles.amountPrefix}>$</span>
                                <input
                                    type="number"
                                    className={styles.amountInput}
                                    value={coinAmount}
                                    onChange={(e) => setCoinAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0.1"
                                    step="0.1"
                                    required
                                />
                                <span className={styles.amountSuffix}>WST ▾</span>
                            </div>
                            <div className={styles.quickAmounts}>
                                <span className={styles.balanceText}>Available balance: 45,000.00 WST</span>
                                <div className={styles.quickBtns}>
                                    <button type="button" className={styles.quickBtn} onClick={() => setQuickAmount(1)}>Max</button>
                                    <button type="button" className={styles.quickBtn} onClick={() => setQuickAmount(0.5)}>50%</button>
                                    <button type="button" className={styles.quickBtn} onClick={() => setQuickAmount(0.1)}>10%</button>
                                </div>
                            </div>

                            {message && (
                                <div className={message.startsWith('success:') ? styles.successMsg : styles.errorMsg}>
                                    {message.replace(/^(success:|error:)/, '')}
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => { setSelectedUser(null); setCoinAmount(''); setMessage(''); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnConfirm}
                                    disabled={processing || !selectedUser}
                                >
                                    {processing ? (
                                        <>
                                            <span className={styles.btnSpinner}></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                            Confirm Transaction
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Recent Transactions */}
                    <div className={styles.transactionsPanel}>
                        <div className={styles.transactionsPanelHeader}>
                            <h2 className={styles.panelTitle}>Recent Transactions</h2>
                            <button className={styles.viewAllBtn}>View All</button>
                        </div>
                        <div className={styles.txTable}>
                            <div className={styles.txHeaderRow}>
                                <span className={styles.txHeaderCell}>STATUS</span>
                                <span className={styles.txHeaderCell}>RECIPIENT</span>
                                <span className={styles.txHeaderCell}>AMOUNT</span>
                                <span className={styles.txHeaderCell}>DATE</span>
                                <span className={styles.txHeaderCell}></span>
                            </div>
                            {transactions.length === 0 ? (
                                <div className={styles.noTx}>No transactions yet</div>
                            ) : (
                                transactions.slice(0, 5).map((tx) => (
                                    <div key={tx._id} className={styles.txRow}>
                                        <span className={styles.txCell}>
                                            <span className={`${styles.txStatus} ${tx.status === 'confirmed' ? styles.txStatusCompleted : styles.txStatusPending}`}>
                                                {tx.status === 'confirmed' ? 'Completed' : 'Pending'}
                                            </span>
                                        </span>
                                        <span className={styles.txCell}>
                                            <div className={styles.txRecipient}>
                                                <div className={styles.txAvatar}>
                                                    {getInitials(tx.user?.name || '?')}
                                                </div>
                                                <span>{tx.user?.name || 'Unknown'}</span>
                                            </div>
                                        </span>
                                        <span className={styles.txCell}>
                                            <span className={styles.txAmount}>+ {tx.amount.toLocaleString()} WST</span>
                                        </span>
                                        <span className={`${styles.txCell} ${styles.txDate}`}>
                                            {formatTimeAgo(tx.created_at)}
                                        </span>
                                        <span className={styles.txCell}>
                                            <button className={styles.txMoreBtn}>···</button>
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
