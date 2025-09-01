"use client";
import { motion } from "framer-motion";
import WalletConnect from "./WalletConnect";
import { VaultIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export const AppBar = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="border-b border-zinc-800/70 bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="max-w-7xl mx-auto px-10 py-6">
        <div className="flex justify-between items-center">
          <motion.div
            initial={{opacity:0,x:-20}}
            animate={{opacity:1,x:0}}
            className="flex items-center space-x-3"
          >
            <div className="p-2 rounded-lg bg-accent/10 glow-soft animate-float">
              <VaultIcon className="w-8 h-8 text-accent"/>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{fontFamily:"var(--font-display)"}}>DAO Treasury</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="h-10 w-10 grid place-items-center rounded-md border border-base bg-card hover:bg-accent/10 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-accent"/>
              ) : (
                <Moon className="h-5 w-5 text-accent"/>
              )}
            </button>
            <WalletConnect
              onConnect={(address) => console.log("Connected to", address)}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
