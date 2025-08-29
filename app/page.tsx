"use client";

import { useEffect, useState } from "react";
import { AppBar } from "./Components/Appbar";
import { AnchorCLient } from "./lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ArrowBigLeft, ArrowBigRight, SendToBackIcon, Trash2Icon } from "lucide-react";

const MOCK_TOKEN_MINT = "So11111111111111111111111111111111111111112"; // Wrapped SOL

interface StakingRecord {
  id: string;
  amount: number;
  timestamp: Date;
  status: 'active' | 'completed' | 'pending';
  transactionHash: string;
  stakeTime?: number;
  unlockTime?: number;
  rewardTime?: number;
}

interface StakingTimeInfo {
  stakeTime: number;
  unlockTime: number;
  rewardTime: number;
  currentTime: number;
  timeUntilUnlock: number;
  timeUntilReward: number;
  canWithdraw: boolean;
  canGetReward: boolean;
  penaltyPeriod: boolean;
  lockPeriod: boolean;
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
  const [stakingTimeInfo, setStakingTimeInfo] = useState<StakingTimeInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

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
    if (anchorClient && publicKey) {
      fetchUserBalance();
      fetchStakingTimeInfo();
    } else {
      setStakingTimeInfo(null);
    }
  }, [anchorClient, publicKey]);

  // Live time tracking for staking
  useEffect(() => {
    if (stakingTimeInfo) {
      const interval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilUnlock = Math.max(0, stakingTimeInfo.unlockTime - currentTime);
        const timeUntilReward = Math.max(0, stakingTimeInfo.rewardTime - currentTime);
        
        if (stakingTimeInfo.penaltyPeriod) {
          setTimeRemaining(`Early withdrawal available: ${anchorClient?.formatTimeRemaining(timeUntilUnlock) || ""} left`);
        } else if (stakingTimeInfo.lockPeriod) {
          setTimeRemaining(`Locked: ${anchorClient?.formatTimeRemaining(timeUntilReward) || ""} until 2x reward`);
        } else {
          setTimeRemaining("Ready for 2x reward withdrawal");
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [stakingTimeInfo, anchorClient]);

  const fetchUserBalance = async () => {
    if (!publicKey) return;
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const balanceInLamports = await connection.getBalance(publicKey);
      const balance = (balanceInLamports / LAMPORTS_PER_SOL);
      setUserBalance(balance);
    } catch (error) {
      console.error("Failed to fetch SOL balance:", error);
      setUserBalance(0);
    }
  };

  const fetchStakingTimeInfo = async () => {
    if (!anchorClient) return;
    try {
      const timeInfo = await anchorClient.getStakingTimeInfo();
      setStakingTimeInfo(timeInfo);
    } catch (error) {
      console.error("Failed to fetch staking time info:", error);
      setStakingTimeInfo(null);
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
      const tx = await anchorClient?.deposit(amount);
      
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
      await fetchUserBalance();
      
      toast.success(`Staking successful! Transaction: ${tx?.slice(0, 8)}...`);
    } catch (error: any) {
      console.error("Staking error:", error);
      toast.error(error.message || "Transaction failed. Please try again.");
    } finally {
      setStaking(false);
    }
  };

  const handleUnstaking = async (stakingRecord: StakingRecord) => {
    if (!publicKey || !anchorClient) return;
    
    try {
      // Check if we can withdraw based on time
      if (stakingTimeInfo) {
        if (stakingTimeInfo.penaltyPeriod) {
          // Within first 24 hours - 10% penalty, but can withdraw
          const penaltyAmount = stakingRecord.amount * 0.1;
          const userAmount = stakingRecord.amount - penaltyAmount;
          
          const confirmed = window.confirm(
            `Early withdrawal within 24 hours!\n\n` +
            `Original amount: ${stakingRecord.amount} SOL\n` +
            `Early withdrawal fee (10%): ${penaltyAmount.toFixed(4)} SOL\n` +
            `You will receive: ${userAmount.toFixed(4)} SOL\n\n` +
            `Continue with early withdrawal?`
          );
          
          if (!confirmed) return;
          
          toast.success("Processing early withdrawal with 10% fee...");
        } else if (stakingTimeInfo.lockPeriod) {
          // Between 24 hours and 30 days - locked
          toast.error("Cannot withdraw! Your tokens are locked for 30 days from staking date.");
          return;
        } else if (stakingTimeInfo.canGetReward) {
          // After 30 days - 2x reward
          const rewardAmount = stakingRecord.amount * 2;
          
          const confirmed = window.confirm(
            `Congratulations! 30 days completed!\n\n` +
            `Original amount: ${stakingRecord.amount} SOL\n` +
            `Reward: ${stakingRecord.amount} SOL\n` +
            `Total you will receive: ${rewardAmount} SOL (2x)\n\n` +
            `Continue with withdrawal?`
          );
          
          if (!confirmed) return;
          
          toast.success("Processing withdrawal with 2x reward...");
        }
      }

      const tx = await anchorClient.withdrawal(MOCK_TOKEN_MINT, stakingRecord.amount);
      
      // Calculate what the user would receive
      let receivedAmount = stakingRecord.amount;
      if (stakingTimeInfo?.penaltyPeriod) {
        receivedAmount = stakingRecord.amount * 0.9; // 10% fee
      } else if (stakingTimeInfo?.canGetReward) {
        receivedAmount = stakingRecord.amount * 2; // 2x reward
      }
      
      // Update staking record status
      setUserStaking(prev => prev.map(stake => 
        stake.id === stakingRecord.id 
          ? { ...stake, status: 'completed' as const }
          : stake
      ));
      
      // Simulate balance update for demo
      setUserBalance(prev => prev + receivedAmount);
      setStaking(false);
      await fetchStakingTimeInfo();
      toast.success(`Withdrawal simulation successful! You would receive ${receivedAmount.toFixed(4)} SOL. Transaction: ${tx?.slice(0, 8)}...`);
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Transaction failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <AppBar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Treasury Staking</h1>
            <p className="text-gray-300 text-lg">Stake your tokens and earn rewards</p>
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ Demo Mode: Withdrawals are simulated. Balance updates are for demonstration only. 
                Connect to actual program for real SOL transfers.
              </p>
            </div>
          </div>
          {connected && (
            <div className="bg-gray-900 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-2">Your Balance</h2>
              <p className="text-3xl font-bold text-green-400">Available: {userBalance} SOL</p>
            </div>
          )}
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
                      {amount > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          <p>Staking amount: {amount} SOL</p>
                          <p>Estimated fees: ~0.005 SOL (first time: ~0.007 SOL)</p>
                          <p className="text-yellow-400">Total required: ~{(amount + 0.005).toFixed(3)} SOL</p>
                        </div>
                      )}
                    </div>

                    {!showTerms && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="accept-terms"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="rounded bg-gray-700 border-gray-600"
                        />
                        <label htmlFor="accept-terms" className="text-sm text-gray-300">
                          I accept the <button onClick={() => setShowTerms(true)} className="text-blue-500 hover:text-blue-600">terms and conditions</button>
                        </label>
                      </div>
                    )}
                    
                    {showTerms && (
                      <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-2 mb-2">
                          <button onClick={() => setShowTerms(false)} className="text-blue-500 hover:text-blue-600"><ArrowBigLeft/></button>
                          <h3 className="font-semibold text-white">Staking Terms & Conditions</h3>
                        </div>
                        <div className="text-sm text-gray-300 space-y-2 mb-4 max-h-62">
                          <p>• <strong>Early Withdrawal (within 24 hours):</strong> Available with 10% fee</p>
                          <p>• <strong>Lock Period (24 hours - 30 days):</strong> Tokens are locked, no withdrawal allowed</p>
                          <p>• <strong>Reward Period (after 30 days):</strong> Receive 2x your staked amount</p>
                          <p>• <strong>Minimum staking period:</strong> 24 hours</p>
                          <p>• <strong>Maximum staking period:</strong> 30 days</p>
                          <p>• <strong>Maximum staking amount:</strong> 1000 SOL</p>
                          <p>• <strong>Platform fee:</strong> 1% on rewards</p>
                          <p>• <strong>Security:</strong> Your tokens are locked in a secure smart contract</p>
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
          {connected && userStaking.length > 0 && (
            <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Your Staking History</h2>
              
              {/* Time Status Display */}
              {stakingTimeInfo && timeRemaining && (
                <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300">Time Status:</p>
                      <p className="text-lg font-semibold text-white">{timeRemaining}</p>
                    </div>
                    <div className="text-right">
                      {stakingTimeInfo.penaltyPeriod && (
                        <p className="text-sm text-red-400">⚠️ Early withdrawal available (10% fee)</p>
                      )}
                      {stakingTimeInfo.lockPeriod && (
                        <p className="text-sm text-yellow-400">🔒 Locked for 30 days</p>
                      )}
                      {stakingTimeInfo.canGetReward && (
                        <p className="text-sm text-green-400">🎉 Ready for 2x reward!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {userStaking.map((staking) => (
                  <div key={staking.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-white">{staking.amount} SOL</p>
                          <p className={`text-sm px-2 py-1 rounded-full ${
                            staking.status === 'active' ? 'bg-green-900 text-green-300' :
                            staking.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                            'bg-yellow-900 text-yellow-300'
                          }`}>
                            {staking.status}
                          </p>
                        </div>
                        <p className="text-sm text-gray-300">
                          {staking.timestamp.toLocaleDateString()} at {staking.timestamp.toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          TX: {staking.transactionHash.slice(0, 8)}...{staking.transactionHash.slice(-8)}
                        </p>
                        {stakingTimeInfo && (
                          <div className="mt-2 text-xs">
                            {stakingTimeInfo.penaltyPeriod && (
                              <p className="text-red-400">Early withdrawal: {staking.amount * 0.9} SOL (10% fee)</p>
                            )}
                            {stakingTimeInfo.lockPeriod && (
                              <p className="text-yellow-400">Locked for 30 days</p>
                            )}
                            {stakingTimeInfo.canGetReward && (
                              <p className="text-green-400">2x Reward: {staking.amount * 2} SOL</p>
                            )}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => handleUnstaking(staking)} 
                        className={`px-3 py-1 rounded text-sm ${
                          stakingTimeInfo?.lockPeriod 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : stakingTimeInfo?.penaltyPeriod
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        disabled={stakingTimeInfo?.lockPeriod}
                      >
                        {stakingTimeInfo?.lockPeriod ? 'Locked' : 
                         stakingTimeInfo?.penaltyPeriod ? 'Early Withdraw' : 'Withdraw'}
                      </button>
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
