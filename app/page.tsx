"use client";

import { useEffect, useState } from "react";
import { AppBar } from "./Components/Appbar";
import { AnchorCLient } from "./lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Mock token mint address - using wrapped SOL
const MOCK_TOKEN_MINT = "So11111111111111111111111111111111111111112"; // Wrapped SOL

interface StakingRecord {
  id: string;
  amount: number;
  timestamp: Date;
  status: 'active' | 'completed' | 'pending';
  transactionHash: string;
}

export default function Home() {
  const { publicKey, connected, wallet } = useWallet();
  const [showfield, setShowfield] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [anchorClient, setAnchorClient] = useState<AnchorCLient | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userStaking, setUserStaking] = useState<StakingRecord[]>([]);
  const [staking, setStaking] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (connected && publicKey && wallet?.adapter) {
      try {
        const client = new AnchorCLient(wallet.adapter);
        setAnchorClient(client);
        console.log("Anchor client initialized");
      } catch (error) {
        console.error("Failed to initialize anchor client:", error);
        toast.error("Failed to initialize wallet connection");
      }
    } else {
      setAnchorClient(null);
    }
  }, [connected, publicKey, wallet]);

  useEffect(() => {
    if (anchorClient) {
      fetchUserBalance();
    }
  }, [anchorClient, publicKey]);

  const fetchUserBalance = async () => {
    if (!publicKey) return;
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      
      // Just check native SOL balance for now
      const balanceInLamports = await connection.getBalance(publicKey);
      const balance = (balanceInLamports / LAMPORTS_PER_SOL);
      setUserBalance(balance);
    } catch (error) {
      console.error("Failed to fetch SOL balance:", error);
      setUserBalance(0);
    }
  };

  const handleStaking = async (amount: number) => {
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions first");
      return;
    }
    
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > userBalance) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      setStaking(true);
      const tx = await anchorClient?.deposit(amount, MOCK_TOKEN_MINT);
      
      const newStaking: StakingRecord = {
        id: Date.now().toString(),
        amount: amount,
        timestamp: new Date(),
        status: 'active',
        transactionHash: tx || 'unknown'
      };
      
      setUserStaking(prev => [newStaking, ...prev]);
      setAmount(0);
      setAcceptedTerms(false);
      setShowfield(false);
      
      // Refresh balance
      await fetchUserBalance();
      
      toast.success(`Staking successful! Transaction: ${tx?.slice(0, 8)}...`);
    } catch (error: any) {
      console.error("Staking error:", error);
      toast.error(error.message || "Transaction failed. Please try again.");
    } finally {
      setStaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <AppBar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Treasury Staking</h1>
            <p className="text-gray-300 text-lg">Stake your tokens and earn rewards</p>
          </div>

          {/* User Balance */}
          {connected && (
            <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-2">Your Balance</h2>
              <p className="text-3xl font-bold text-green-400">{userBalance} SOL</p>
            </div>
          )}

          {/* Staking Form */}
          <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Stake Tokens</h2>
            
            {!connected ? (
              <div className="text-center py-8">
                <p className="text-gray-300 mb-4">Please connect your wallet to start staking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {showfield ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount to Stake (SOL)
                      </label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        className="w-full border border-gray-600 bg-gray-800 text-white p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        onChange={(e) => setAmount(Number(e.target.value))}
                        value={amount || ''}
                        min="0"
                        step="0.0001"
                      />
                    </div>
                    
                    {!showTerms && (
                      <button
                        onClick={() => setShowTerms(true)}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Terms & Conditions
                      </button>
                    )}
                    
                    {showTerms && (
                      <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                        <h3 className="font-semibold text-white mb-2">Staking Terms & Conditions</h3>
                        <div className="text-sm text-gray-300 space-y-2 mb-4 max-h-40 overflow-y-auto">
                          <p>• Minimum staking period: 30 days</p>
                          <p>• Early withdrawal penalty: 5% of staked amount</p>
                          <p>• Rewards are distributed monthly</p>
                          <p>• Maximum staking amount: 1000 SOL</p>
                          <p>• Platform fee: 1% on rewards</p>
                          <p>• Your tokens are locked in a secure smart contract</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="accept-terms"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="rounded bg-gray-700 border-gray-600"
                          />
                          <label htmlFor="accept-terms" className="text-sm text-gray-300">
                            I accept the terms and conditions
                          </label>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowfield(false);
                          setShowTerms(false);
                          setAcceptedTerms(false);
                          setAmount(0);
                        }}
                        className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
                        disabled={staking}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStaking(amount)}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        disabled={staking || !acceptedTerms || amount <= 0}
                      >
                        {staking ? 'Processing...' : 'Stake Now'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowfield(true)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start Staking
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Staking History */}
          {connected && userStaking.length > 0 && (
            <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Your Staking History</h2>
              <div className="space-y-3">
                {userStaking.map((staking) => (
                  <div key={staking.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-white">{staking.amount} SOL</p>
                        <p className="text-sm text-gray-300">
                          {staking.timestamp.toLocaleDateString()} at {staking.timestamp.toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          TX: {staking.transactionHash.slice(0, 8)}...{staking.transactionHash.slice(-8)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        staking.status === 'active' ? 'bg-green-900 text-green-300' :
                        staking.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {staking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
