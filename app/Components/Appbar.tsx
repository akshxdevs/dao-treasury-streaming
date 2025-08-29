"use client";
import { motion } from "framer-motion";
import WalletConnect from "./WalletConnect";
import { VaultIcon } from "lucide-react";

export const AppBar = () => {
  return (
    <div className="border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-10 py-6">
        <div className="flex justify-between items-center">
          <motion.div
            initial={{opacity:0,x:-20}}
            animate={{opacity:1,x:0}}
            className="flex items-center space-x-3"
          >
            <div>
              <VaultIcon className="w-10 h-10 text-green-400"/>
            </div>
            <h1 className="text-2xl font-bold text-white">DOA Treasury</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <WalletConnect
              onConnect={(address) => console.log("Connected to", address)}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
