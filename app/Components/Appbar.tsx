"use client";
import { motion } from "framer-motion";
import WalletConnect from "./WalletConnect";
import { BanknoteX, VaultIcon } from "lucide-react";
export const AppBar = () => {
  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center">
          <motion.div
          initial={{opacity:0,x:-20}}
          animate={{opacity:1,x:0}}
          className="flex items-center space-x-3">
            <div>
                <VaultIcon className="w-10 h-10"/>
            </div>
            <h1 className="text-2xl">DOA Treasury</h1>
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
