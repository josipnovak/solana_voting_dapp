'use client';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { useEffect, useState } from 'react';
import idl from '../../constants/test.json'; 
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import styles from './myPolls.module.css';

export default function MyPollsPage() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [polls, setPolls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchPolls = async () => {
        if (!wallet) return;
        try {
            const provider = new anchor.AnchorProvider(connection, wallet, {});
            const program = new anchor.Program(idl as any, provider);
            const allPolls = await (program.account as any).poll.all();
        
            const filtered = allPolls.filter((p: any) => 
                p.account.author.toString() === wallet.publicKey.toString()
            );
            
            setPolls(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const closePoll = async (pollPubkey: anchor.web3.PublicKey) => {
        if (!wallet) return;
        if (!confirm("Are you sure you want to close this poll? This cannot be undone.")) return;

        try {
            const provider = new anchor.AnchorProvider(connection, wallet, {});
            const program = new anchor.Program(idl as any, provider);

            await program.methods.closePoll().accounts({
                poll: pollPubkey,
                author: wallet.publicKey,
            }).rpc();

            fetchPolls();
        } catch (e) {
            console.error(e);
            alert("Error closing poll: " + e);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchPolls();
    }, [wallet]);

    if (!mounted) return null;

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <nav className={styles.nav}>
                    <Link href="/" className={styles.navLink}>Create</Link>
                    <Link href="/polls" className={styles.navLink}>Explore</Link>
                    <Link href="/polls/my" className={styles.navLinkActive}>My Polls</Link>
                    <div className={styles.walletWrapper}><WalletMultiButton /></div>
                </nav>

                <header className={styles.header}>
                    <h1 className={styles.title}>My Creations</h1>
                    <p className={styles.subtitle}>View results of polls you started on the network.</p>
                </header>

                {loading ? (
                    <div className={styles.loading}><div className={styles.spinner}></div></div>
                ) : (
                    <div className={styles.grid}>
                        {polls.length === 0 && <div className={styles.emptyState}>No polls created by you at the moment.</div>}
                        {polls.map((poll) => (
                            <div key={poll.publicKey.toString()} className={styles.pollCard}>
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.pollTitle}>{poll.account.title}</h2>
                                    <div className={styles.headerActions}>
                                        <span className={styles.authorBadge}>AUTHOR</span>
                                        <button 
                                            onClick={() => closePoll(poll.publicKey)}
                                            className={styles.closeButton}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.optionsGrid}>
                                    {poll.account.options.map((opt: any, idx: number) => {
                                        const totalVotes = poll.account.options.reduce((acc: number, curr: any) => acc + curr.voteCount.toNumber(), 0);
                                        const percentage = totalVotes > 0 ? Math.round((opt.voteCount.toNumber() / totalVotes) * 100) : 0;

                                        return (
                                            <div key={idx} className={styles.resultBar}>
                                                <div 
                                                    className={styles.progressBar} 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                                <div className={styles.optionContent}>
                                                    <span className={styles.optionName}>{opt.name}</span>
                                                    <div className={styles.voteStats}>
                                                        <span className={styles.percentage}>{percentage}%</span>
                                                        <span className={styles.voteCount}>{opt.voteCount.toString()} votes</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
