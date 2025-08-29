interface Window {
  solana?: {
    isPhanthom?: boolean;
    isSolflare?: boolean;
    isBackpack?: boolean;
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    signTransaction: (tx: any) => Promise<any>;
    signAllTransaction: (tx: any[]) => Promise<any[]>;
    publicKey?: { string: () => string };
  };
}
declare global {
  interface ProcessEnv {
    NEXT_PUBLIC_SOLANA_RPC_URL?: string;
    NEXT_PUBLIC_PROGRAM_ID?: string;
    NEXT_PUBLIC_NETWORK?: "devnet" | "mainnet-beta" | "testnet";
  }
  interface Vault {
    publicKey: string;
  }
  interface UserProfile {
    publicKey: string;
    balance: number;
    unlockTime: number;
    amount: number;
    tokenAccounts: {
      user: string;
      vault: string;
      treasury: string;
    };  
  }
}

export {};
