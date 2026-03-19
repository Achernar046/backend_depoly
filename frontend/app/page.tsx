import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <div className={styles.page}>
            {/* Top Navigation */}
            <nav className={styles.topNav}>
                <div className={styles.navLeft}>
                    <span className={styles.brand}>WASTECOIN</span>
                    <div className={styles.navLinks}>
                        <a href="/" className={`${styles.navLink} ${styles.navLinkActive}`}>Home</a>
                        <a href="#how" className={styles.navLink}>
                            Get started
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                        </a>
                        <a href="#stats" className={styles.navLink}>About</a>
                        <a href="#" className={styles.navLink}>Forum</a>
                    </div>
                </div>
                <div className={styles.navRight}>
                    <div className={styles.searchBar}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <span>Try &apos;Recycling centers&apos;</span>
                    </div>
                    <Link href="/auth" className={styles.navLoginBtn}>
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroText}>
                        <span className={styles.heroTag}>SUSTAINABLE FUTURE SOURCE</span>
                        <h1 className={styles.heroTitle}>
                            Turn Your <span className={styles.highlight}>Waste</span> Into
                            Valuable <span className={styles.highlight}>Coins</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            Join the blockchain revolution in waste management. Submit your waste,
                            get verified by officers, and earn WasteCoin (WST) tokens on the Sepolia blockchain.
                        </p>
                        <div className={styles.heroCta}>
                            <Link href="/auth" className={styles.btnPrimary}>
                                Get Started
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                            </Link>
                            <Link href="#how" className={styles.btnGhost}>
                                Learn More
                            </Link>
                        </div>
                    </div>
                    <div className={styles.heroVisual}>
                        <div className={styles.heroCard}>
                            <div className={styles.heroCardHeader}>
                                <div className={styles.heroCardDot} style={{ background: '#ef4444' }}></div>
                                <div className={styles.heroCardDot} style={{ background: '#f59e0b' }}></div>
                                <div className={styles.heroCardDot} style={{ background: '#22c55e' }}></div>
                            </div>
                            <div className={styles.heroCardBody}>
                                <div className={styles.mockRow}>
                                    <span className={styles.mockLabel}>Waste Type</span>
                                    <span className={styles.mockValue}>Plastic — 2.5 kg</span>
                                </div>
                                <div className={styles.mockRow}>
                                    <span className={styles.mockLabel}>Status</span>
                                    <span className={styles.mockBadge}>✓ Approved</span>
                                </div>
                                <div className={styles.mockRow}>
                                    <span className={styles.mockLabel}>Reward</span>
                                    <span className={styles.mockCoin}>+ 50 WST</span>
                                </div>
                                <div className={styles.mockTx}>
                                    <span className={styles.mockTxHash}>Tx: 0xab3f...8c21</span>
                                    <span className={styles.mockTxNet}>Sepolia</span>
                                </div>
                            </div>
                        </div>
                        {/* Decorative floating elements */}
                        <div className={`${styles.floater} ${styles.floater1}`}>♻️</div>
                        <div className={`${styles.floater} ${styles.floater2}`}>🪙</div>
                        <div className={`${styles.floater} ${styles.floater3}`}>🌱</div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className={styles.features} id="how">
                <div className={styles.sectionInner}>
                    <span className={styles.sectionTag}>HOW IT WORKS</span>
                    <h2 className={styles.sectionTitle}>Three simple steps to earn</h2>
                    <p className={styles.sectionSubtitle}>
                        No crypto knowledge required. We handle the blockchain part for you.
                    </p>

                    <div className={styles.featureGrid}>
                        <div className={styles.featureCard}>
                            <div className={`${styles.featureIcon} ${styles.featureIconBlue}`}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            </div>
                            <div className={styles.featureStep}>Step 01</div>
                            <h3 className={styles.featureTitle}>Submit Waste</h3>
                            <p className={styles.featureDesc}>
                                Take a photo of your waste, specify the type and weight, and submit it to the system.
                            </p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={`${styles.featureIcon} ${styles.featureIconGreen}`}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            </div>
                            <div className={styles.featureStep}>Step 02</div>
                            <h3 className={styles.featureTitle}>Officer Verification</h3>
                            <p className={styles.featureDesc}>
                                Our trained officers review your submission and determine the coin reward based on waste type.
                            </p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={`${styles.featureIcon} ${styles.featureIconPurple}`}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                            </div>
                            <div className={styles.featureStep}>Step 03</div>
                            <h3 className={styles.featureTitle}>Earn Coins</h3>
                            <p className={styles.featureDesc}>
                                Receive WasteCoin (WST) tokens directly to your auto-generated wallet on the Sepolia blockchain.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className={styles.stats} id="stats">
                <div className={styles.sectionInner}>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber}>100%</div>
                            <div className={styles.statLabel}>Transparent</div>
                            <p className={styles.statDesc}>Every transaction recorded on the blockchain</p>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </div>
                            <div className={styles.statLabel}>Secure</div>
                            <p className={styles.statDesc}>Encrypted wallets and private keys</p>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber}>♻️</div>
                            <div className={styles.statLabel}>Sustainable</div>
                            <p className={styles.statDesc}>Incentivizing proper waste management</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <span className={styles.footerBrand}>WASTECOIN</span>
                    <span className={styles.footerCopy}>© 2024 WasteCoin. All rights reserved.</span>
                    <div className={styles.footerLinks}>
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
