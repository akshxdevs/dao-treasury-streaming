import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { WalletAdapter } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "92KUjGGCrEM6kcnMd4pgze3EPnS3PwsXhpDeLB9vGpE9"
);

const TREASURY_ADDRESS = new PublicKey(
  "11111111111111111111111111111112"
);

export class AnchorCLient {
  private connection: Connection;
  private wallet: WalletAdapter;
  
  constructor(wallet: WalletAdapter) {
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    this.wallet = wallet;
  }

  async intialize() {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      console.log("Initialize transaction:", vault.toString());
      return "mock_transaction_signature";
    } catch (error) {
      console.error("Initialize error:", error);
      throw error;
    }
  }
  
  async deposit(amount: number, mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      
      console.log("Starting deposit process...");
      console.log("Amount:", amount);
      console.log("Mint address:", mintAddress);
      console.log("User public key:", this.wallet.publicKey.toString());
      
      // For now, let's just simulate the deposit since we're using native SOL
      // In a real implementation, you'd convert SOL to wrapped SOL first
      
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log("Vault address:", vault.toString());
      
      // Check user's SOL balance
      const solBalance = await this.connection.getBalance(this.wallet.publicKey);
      const userBalanceAmount = solBalance / LAMPORTS_PER_SOL;
      
      console.log("User SOL balance:", userBalanceAmount);
      console.log("Requested amount:", amount);
      
      if (userBalanceAmount < amount) {
        throw new Error(`Insufficient SOL balance. You have ${userBalanceAmount.toFixed(4)} SOL, but trying to stake ${amount}`);
      }
      
      // For now, just return a mock transaction signature
      // In a real implementation, you would:
      // 1. Convert SOL to wrapped SOL
      // 2. Transfer wrapped SOL to vault
      const mockSignature = "mock_transaction_" + Date.now();
      
      console.log("Mock deposit transaction successful:", mockSignature);
      return mockSignature;
      
    } catch (error) {
      console.error("Deposit error:", error);
      if (error instanceof Error) {
        throw new Error(`Transaction failed: ${error.message}`);
      }
      throw new Error("Transaction failed with unknown error");
    }
  }
  
  async withdrawal(mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      const mint = new PublicKey(mintAddress);
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const userAta = await getAssociatedTokenAddress(
        mint,
        this.wallet.publicKey
      );
      const vaultAta = await getAssociatedTokenAddress(mint, vault, true);
      const treasuryAta = await getAssociatedTokenAddress(
        mint,
        TREASURY_ADDRESS
      );
      console.log("Withdrawal transaction would be sent to:", vault.toString());
      return "mock_withdrawal_transaction_signature";
    } catch (error) {
      console.error("Withdrawal error:", error);
      throw error;
    }
  }
  
  async getUserBalance(mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      const mint = new PublicKey(mintAddress);
      const userAta = await getAssociatedTokenAddress(mint, this.wallet.publicKey);
      const balance = await this.connection.getTokenAccountBalance(userAta);
      return balance.value.amount;
    } catch (error) {
      console.error("Get user balance error:", error);
      throw error;
    }
  }
  
  async getVaultBalance(mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      const mint = new PublicKey(mintAddress);
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey?.toBuffer()],
        PROGRAM_ID
      );
      const vaultAta = await getAssociatedTokenAddress(mint, vault, true);
      const balance = await this.connection.getTokenAccountBalance(vaultAta);
      return balance.value.amount;
    } catch (error) {
      console.error("Get vault balance error:", error);
      throw error;
    }
  }
  
  async getTreasuryBalance(mintAddress: string) {
    try {
      const mint = new PublicKey(mintAddress);
      const treasuryAta = await getAssociatedTokenAddress(mint, TREASURY_ADDRESS);
      const balance = await this.connection.getTokenAccountBalance(treasuryAta);
      return balance.value.amount;
    } catch (error) {
      console.error("Get treasury balance error:", error);
      throw error;
    }
  }
}
