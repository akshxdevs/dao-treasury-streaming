"use client";
import { motion } from "framer-motion";
import WalletConnect from "./WalletConnect";
import { VaultIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export const AppBar = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className={`border-b border-zinc-800/70 ${theme == "dark" ? "bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/30" : "bg-white backdrop-blur supports-[backdrop-filter]:bg-whiite/50"}`}>
    <div className="max-w-7xl mx-auto px-10 py-4">
        <div className="flex justify-between items-center">
          <motion.div
            initial={{opacity:0,x:-20}}
            animate={{opacity:1,x:0}}
            className="flex items-center space-x-3"
          >
            <div className="p-2 rounded-lg bg-accent/10 glow-soft animate-float">
              <VaultIcon className="w-8 h-8 text-accent"/>
            </div>
            <h1 className={`text-2xl font-bold ${theme == "dark" ? "text-white" : "text-black"} tracking-tight`} style={{fontFamily:"var(--font-display)"}}>DAO Treasury</h1>
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
