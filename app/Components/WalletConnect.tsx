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
  const shortAddress = (address:string) => {
    return `${address.slice(0,4)}...${address.slice(-4)}`
  }
  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-3 border">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse transition-transform duration-100"></div>
          <span className="font-semibold text-lg">Connected</span>
        </div>
        <button onClick={copyAddress} className="flex space-x-3 items-center">
          <span className="border border-gray-700 p-2 rounded-lg">{shortAddress(publicKey.toString())}</span>
          {copied ? <Check /> : <Copy />}
        </button>
        <WalletMultiButton />
      </div>
    );
  }
  return (
    <div>
      <WalletMultiButton className="" />
    </div>
  );
}
