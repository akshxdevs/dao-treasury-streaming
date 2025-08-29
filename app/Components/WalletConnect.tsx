"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import dynamic from "next/dynamic";

// Dynamically import WalletMultiButton to avoid hydration issues
const DynamicWalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => ({ default: mod.WalletMultiButton })),
  { ssr: false }
);

interface WalletConnectProps {
  onConnect?: (address: String) => void;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const { publicKey, connected } = useWallet();
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      toast.success("Address copied to clipboard!");
      setTimeout(() => setCopied(false), 5000);
    } catch (error) {
      toast.error("Failed to copy address!");
    }
  };

  const shortAddress = (address:string) => {
    return `${address.slice(0,4)}...${address.slice(-4)}`
  }

  if (!mounted) {
    return <div className="h-10 w-32 bg-gray-700 rounded animate-pulse"></div>;
  }

  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse transition-transform duration-100"></div>
        </div>
        <button onClick={copyAddress} className="flex space-x-3 items-center bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
          {copied ? <Check className="text-green-400" /> : <Copy className="text-gray-400" />}
        </button>
        <DynamicWalletMultiButton className="!bg-green-600 hover:!bg-green-700 !text-white" />
      </div>
    );
  }
  return (
    <div>
      <DynamicWalletMultiButton className="!bg-green-600 hover:!bg-green-700 !text-white" />
    </div>
  );
}
