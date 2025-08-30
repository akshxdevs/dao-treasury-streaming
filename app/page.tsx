"use client";

import { useEffect, useState } from "react";
import { AppBar } from "./Components/Appbar";
import { AnchorCLient } from "./lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ArrowBigLeft } from "lucide-react";

const MOCK_TOKEN_MINT = "So11111111111111111111111111111111111111112";

interface StakingRecord {
  id: string;
  amount: number;
  timestamp: Date;
  status: 'active' | 'completed';
  transactionHash: string;
  stakeTime: number;
  unlockTime: number;
  rewardTime: number;
  timeRemaining?: string;
  canWithdraw?: boolean;
  canGetReward?: boolean;
  penaltyPeriod?: boolean;
  lockPeriod?: boolean;
  userPublicKey: string;
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
      const client = new AnchorCLient(wallet.adapter);
      setAnchorClient(client);
    } else {
      setAnchorClient(null);
    }
  }, [connected, publicKey, wallet]);

  useEffect(() => {
    if (anchorClient && publicKey) {
      fetchUserBalance();
    }
  }, [anchorClient, publicKey]);

  useEffect(() => {
    if (userStaking.length === 0) return;

    const updateStakeTiming = () => {
      const currentTime = Math.floor(Date.now() / 1000);
      
      setUserStaking(prev => prev.map(stake => {
        if (stake.status === 'completed') return stake;
        if (stake.userPublicKey !== publicKey?.toString()) return stake;
        
        const timeUntilUnlock = Math.max(0, stake.unlockTime - currentTime);
        const timeUntilReward = Math.max(0, stake.rewardTime - currentTime);
        
        const penaltyPeriod = currentTime < stake.unlockTime;
        const lockPeriod = currentTime >= stake.unlockTime && currentTime < stake.rewardTime;
        const canGetReward = currentTime >= stake.rewardTime;
        const canWithdraw = canGetReward || penaltyPeriod;
        
        let timeRemaining = "";
        if (penaltyPeriod) {
          timeRemaining = `Early withdrawal: ${formatTime(timeUntilUnlock)} left`;
        } else if (lockPeriod) {
          timeRemaining = `Locked: ${formatTime(timeUntilReward)} until 2x reward`;
        } else {
          timeRemaining = "Ready for 2x reward withdrawal";
        }
        
        return {
          ...stake,
          timeRemaining,
          canWithdraw,
          canGetReward,
          penaltyPeriod,
          lockPeriod
        };
      }));
    };

    updateStakeTiming();
    const interval = setInterval(updateStakeTiming, 1000);
    return () => clearInterval(interval);
  }, [userStaking.length, publicKey]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  };

  const fetchUserBalance = async () => {
    if (!publicKey) return;
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const balanceInLamports = await connection.getBalance(publicKey);
      const balance = (balanceInLamports / LAMPORTS_PER_SOL);
      setUserBalance(balance);
    } catch (error) {
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
      const tx = await anchorClient?.deposit(amount);
      
      const newStaking: StakingRecord = {
        id: Date.now().toString(),
        amount: amount,
        timestamp: new Date(),
        status: 'active',
        transactionHash: tx || 'unknown',
        stakeTime: Math.floor(Date.now() / 1000),
        unlockTime: Math.floor(Date.now() / 1000) + 30,
        rewardTime: Math.floor(Date.now() / 1000) + 60,
        userPublicKey: publicKey?.toString() || "unknown"
      };
      setUserStaking(prev => [newStaking, ...prev]);
      setAmount(0);
      setAcceptedTerms(false);
      setShowfield(false);
      await fetchUserBalance();
      
      toast.success(`Staking successful!`);
    } catch (error: any) {
      toast.error(error.message || "Transaction failed");
    } finally {
      setStaking(false);
    }
  };

  const handleUnstaking = async (stakingRecord: StakingRecord) => {
    if (!publicKey || !anchorClient) return;
    
    // Ensure only the stake owner can withdraw
    if (stakingRecord.userPublicKey !== publicKey.toString()) {
      toast.error("You can only withdraw your own stakes");
      return;
    }
    
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      let receivedAmount = stakingRecord.amount;
      
      if (stakingRecord.status === 'active') {
        if (currentTime < stakingRecord.unlockTime) {
          receivedAmount = stakingRecord.amount * 0.9;
          const penaltyAmount = stakingRecord.amount * 0.1;
          
          const confirmed = window.confirm(
            `Early withdrawal within 30 seconds!\n\n` +
            `Original amount: ${stakingRecord.amount} SOL\n` +
            `Early withdrawal fee (10%): ${penaltyAmount.toFixed(4)} SOL\n` +
            `You will receive: ${receivedAmount.toFixed(4)} SOL\n\n` +
            `Continue with early withdrawal?`
          );
          
          if (!confirmed) return;
        } else if (currentTime >= stakingRecord.unlockTime && currentTime < stakingRecord.rewardTime) {
          toast.error("Cannot withdraw! Your tokens are locked for 60 seconds from staking date.");
          return;
        } else if (currentTime >= stakingRecord.rewardTime) {
          receivedAmount = stakingRecord.amount * 2;
          
          const confirmed = window.confirm(
            `Congratulations! 60 seconds completed!\n\n` +
            `Original amount: ${stakingRecord.amount} SOL\n` +
            `Reward: ${stakingRecord.amount} SOL\n` +
            `Total you will receive: ${receivedAmount} SOL (2x)\n\n` +
            `Continue with withdrawal?`
          );
          
          if (!confirmed) return;
        }
      }

      const tx = await anchorClient.withdrawal(MOCK_TOKEN_MINT, stakingRecord.amount);
      
      setUserStaking(prev => prev.map(stake => 
        stake.id === stakingRecord.id 
          ? { ...stake, status: 'completed' as const }
          : stake
      ));
      
      console.log(`Balance before: ${userBalance}, Adding: ${receivedAmount}, New balance: ${userBalance + receivedAmount}`);
      setUserBalance(prev => prev + receivedAmount);
      
      setStaking(false);
      toast.success(`Withdrawal successful! You received ${receivedAmount.toFixed(4)} SOL`);
    } catch (error: any) {
      toast.error(error.message || "Transaction failed");
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
                ⚠️ Demo Mode: Withdrawals show real transactions in your wallet for demonstration. 
                Connect to actual program for real SOL transfers from vault.
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
                          <h3 className="font-semibold text-white">Staking Terms</h3>
                        </div>
                        <div className="text-sm text-gray-300 space-y-2 mb-4">
                          <p>• <strong>Early Withdrawal (0-30s):</strong> 10% fee</p>
                          <p>• <strong>Lock Period (30-60s):</strong> No withdrawal</p>
                          <p>• <strong>Reward Period (60s+):</strong> 2x reward</p>
                          <p>• <strong>Max amount:</strong> 1000 SOL</p>
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
              
              {userStaking
                .filter(staking => staking.userPublicKey === publicKey?.toString())
                .map((staking) => (
                <div key={staking.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-white">{staking.amount} SOL</p>
                        <p className={`text-sm px-2 py-1 rounded-full ${
                          staking.status === 'active' ? 'bg-green-900 text-green-300' :
                          'bg-blue-900 text-blue-300'
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
                      {staking.timeRemaining && staking.status === 'active' && (
                        <div className="mt-2 text-xs">
                          <p className="text-sm font-semibold text-white">{staking.timeRemaining}</p>
                          {staking.penaltyPeriod && (
                            <p className="text-red-400">Early withdrawal: {(staking.amount * 0.9).toFixed(4)} SOL (10% fee)</p>
                          )}
                          {staking.lockPeriod && (
                            <p className="text-yellow-400">Locked for another 30 seconds totally 60 seconds</p>
                          )}
                          {staking.canGetReward && (
                            <p className="text-green-400">2x Reward: {(staking.amount * 2).toFixed(4)} SOL</p>
                          )}
                        </div>
                      )}
                      {staking.status === 'completed' && (
                        <div className="mt-2 text-xs">
                          <p className="text-green-400">✅ Withdrawal completed</p>
                        </div>
                      )}
                    </div>
                    {staking.status === 'active' && (
                      <button 
                        onClick={() => handleUnstaking(staking)} 
                        className={`px-3 py-1 rounded text-sm ${
                          staking.lockPeriod 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : staking.penaltyPeriod
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        disabled={staking.lockPeriod}
                      >
                        {staking.lockPeriod ? 'Locked' : 
                         staking.penaltyPeriod ? 'Early Withdraw' : 'Withdraw'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
