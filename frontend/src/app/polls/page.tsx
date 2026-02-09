'use client';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { useEffect, useState } from 'react';
import idl from '../constants/test.json'; 
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import styles from './polls.module.css';

export default function AllPollsPage() {
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
                p.account.author.toString() !== wallet.publicKey.toString()
            );
            
            setPolls(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchPolls();
    }, [wallet]);

    const castVote = async (pollPubkey: anchor.web3.PublicKey, optionIndex: number) => {
        if (!wallet) return;
        try {
            const provider = new anchor.AnchorProvider(connection, wallet, {});
            const program = new anchor.Program(idl as any, provider);
            const [voteReceiptPDA] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("vote"), pollPubkey.toBuffer(), wallet.publicKey.toBuffer()],
                program.programId
            );

            await program.methods.vote(new anchor.BN(optionIndex)).accounts({
                poll: pollPubkey,
                voter: wallet.publicKey,
                voteReceipt: voteReceiptPDA,
                systemProgram: anchor.web3.SystemProgram.programId,
            }).rpc();

            alert("Vote successfully recorded!");
            fetchPolls();
        } catch (e) {
            alert("This wallet has already voted on this poll (or you are the author)!");
        }
    };

    if (!mounted) return null;

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <nav className={styles.nav}>
                    <Link href="/" className={styles.navLink}>Create</Link>
                    <Link href="/polls" className={styles.navLinkActive}>Explore</Link>
                    <Link href="/polls/my" className={styles.navLink}>My Polls</Link>
                    <div className={styles.walletWrapper}><WalletMultiButton /></div>
                </nav>

                <header className={styles.header}>
                    <h1 className={styles.title}>Community Polls</h1>
                    <p className={styles.subtitle}>Discover what others think and vote on the blockchain.</p>
                </header>

                {loading ? (
                    <div className={styles.loading}><div className={styles.spinner}></div></div>
                ) : (
                    <div className={styles.grid}>
                        {polls.length === 0 && <div className={styles.emptyState}>No community polls available at the moment.</div>}
                        {polls.map((poll) => (
                            <div key={poll.publicKey.toString()} className={styles.pollCard}>
                                <h2 className={styles.pollTitle}>{poll.account.title}</h2>
                                <div className={styles.optionsGrid}>
                                    {poll.account.options.map((opt: any, idx: number) => {
                                        const totalVotes = poll.account.options.reduce((acc: number, curr: any) => acc + curr.voteCount.toNumber(), 0);
                                        const percentage = totalVotes > 0 ? Math.round((opt.voteCount.toNumber() / totalVotes) * 100) : 0;

                                        return (
                                            <button 
                                                key={idx}
                                                onClick={() => castVote(poll.publicKey, idx)}
                                                className={styles.voteButton}
                                            >
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
                                            </button>
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
