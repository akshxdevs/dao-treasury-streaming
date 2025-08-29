"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface WalletConnectProps {
  onConnect?: (address: String) => void;
}
export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const { publicKey, connected } = useWallet();
  const [copied, setCopied] = useState(false);
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

  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse transition-transform duration-100"></div>
        </div>
        <button onClick={copyAddress} className="flex space-x-3 items-center bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
          {copied ? <Check className="text-green-400" /> : <Copy className="text-gray-400" />}
        </button>
        <WalletMultiButton className="!bg-green-600 hover:!bg-green-700 !text-white" />
      </div>
    );
  }
  return (
    <div>
      <WalletMultiButton className="!bg-green-600 hover:!bg-green-700 !text-white" />
    </div>
  );
}
