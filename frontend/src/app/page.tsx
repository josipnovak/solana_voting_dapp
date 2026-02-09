'use client';
import dynamic from 'next/dynamic';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { useState } from 'react';
import idl from './constants/test.json'; 
import styles from './home.module.css';
import Link from 'next/link';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  const [title, setTitle] = useState("");
  const [optionsString, setOptionsString] = useState(""); 
  const [status, setStatus] = useState("");

  const createPoll = async () => {
    if (!wallet) return alert("Connect wallet first!");
    if (!title || !optionsString) return alert("Fill in all fields!");
    
    setStatus("Sending to blockchain...");
    
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program(idl as any, provider);
    const pollAccount = anchor.web3.Keypair.generate();

    const options = optionsString.split(',').map(s => s.trim()).filter(s => s !== "");

    try {
      await program.methods
        .initializePoll(title, options) 
        .accounts({
          poll: pollAccount.publicKey,
          author: wallet.publicKey,
        })
        .signers([pollAccount]) 
        .rpc();

      setStatus("Success! Poll: " + pollAccount.publicKey.toString());
    } catch (err) {
      console.error(err);
      setStatus("Error: Check console");
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.nav}>
            <Link href="/" className={styles.navLinkActive}>Create</Link>
            <Link href="/polls" className={styles.navLink}>Explore</Link>
            <Link href="/polls/my" className={styles.navLink}>My Polls</Link>
            <div className={styles.walletWrapper}><WalletMultiButton /></div>
        </nav>

        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Question:</label>
              <input 
                type="text" 
                className={styles.input}
                placeholder="Question for the poll"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Options (comma separated):</label>
              <input 
                type="text" 
                className={styles.input}
                placeholder="Option1, Option2, Option3"
                value={optionsString}
                onChange={(e) => setOptionsString(e.target.value)}
              />
            </div>

            <button 
              onClick={createPoll}
              className={styles.button}
            >
              Publish to Blockchain
            </button>

            {status && (
              <div className={styles.status}>
                {status}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
