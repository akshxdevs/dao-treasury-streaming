"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletConnectProps {
    onConnect?:(address:String) => void;
}

export default function WalletConnect({onConnect}:WalletConnectProps) {
    const {publicKey,connected} = useWallet();
    const [copied,setCopied] = useState(false);

    if (connected && publicKey) {
        return (
            <motion.div>

            </motion.div>
        );
    }
    return(
        <motion.div
        >
            <WalletMultiButton className=""/>
        </motion.div>
    );
}
