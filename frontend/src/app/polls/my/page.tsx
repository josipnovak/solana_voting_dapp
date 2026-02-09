'use client';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import idl from '../../constants/test.json'; 
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import styles from './myPolls.module.css';

function PollChart({ options }: { options: any[] }) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !options) return;
        
        d3.select(svgRef.current).selectAll("*").remove();

        const data = options.map((opt: any) => ({
            label: opt.name,
            value: opt.voteCount.toNumber()
        }));
        
        const totalVotes = d3.sum(data, d => d.value);
        const width = 450;
        const height = 250;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = d3.select(svgRef.current)
            .attr("width", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const color = d3.scaleOrdinal(d3.schemeCategory10);

        const pie = d3.pie<any>().value(d => d.value).sort(null);
        const data_ready = pie(data);

        const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);
        const arcLabel = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

        svg.selectAll('slices')
            .data(data_ready)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => color(i.toString()))
            .attr("stroke", "#0f172a")
            .style("stroke-width", "1px")
            .style("opacity", 0.8);

        svg.selectAll('slices')
            .data(data_ready)
            .enter()
            .filter(d => (d.endAngle - d.startAngle) > 0.25)
            .append('text')
            .text(d => {
                 const percent = totalVotes > 0 ? Math.round((d.data.value / totalVotes) * 100) : 0;
                 return `${percent}%`;
            })
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "white")
            .style("font-weight", "bold");

    }, [options]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg ref={svgRef} style={{ width: '100%', maxHeight: '300px' }}></svg>
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {options.map((opt: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                        <div style={{ width: '12px', height: '12px', backgroundColor: d3.schemeCategory10[i % 10], marginRight: '5px', borderRadius: '2px' }}></div>
                        <span>{opt.name}: {opt.voteCount.toString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
                    <h1 className={styles.title}>My Polls</h1>
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
                                        <button 
                                            onClick={() => closePoll(poll.publicKey)}
                                            className={styles.closeButton}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.optionsGrid}>
                                    <PollChart options={poll.account.options} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
