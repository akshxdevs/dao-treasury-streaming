import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, NATIVE_MINT } from "@solana/spl-token";
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
  
  async deposit(amount: number) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      const transaction = new Transaction();
      const transferSolInstruction = SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: vault,
        lamports: amount * LAMPORTS_PER_SOL
      });
      transaction.add(transferSolInstruction);
      
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      const signature = await this.wallet.sendTransaction(transaction, this.connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3
      });
      
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      return signature;
      
    } catch (error) {
      console.error("Staking error:", error);
      if (error instanceof Error) {
        throw new Error(`Transaction failed: ${error.message}`);
      }
      throw new Error("Transaction failed with unknown error");
    }
  }
  
  async withdrawal(mintAddress: string, amount: number) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      const mint = new PublicKey(mintAddress);
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Get vault account info to check timing
      const vaultAccount = await this.connection.getAccountInfo(vault);
      if (!vaultAccount) {
        throw new Error("Vault not found");
      }

      // Get staking time info to determine withdrawal type
      const timeInfo = await this.getStakingTimeInfo();
      if (!timeInfo) {
        throw new Error("Unable to get staking time information");
      }

      // Simulate the withdrawal based on time rules
      console.log("Withdrawal simulation based on time rules");
      
      if (timeInfo.penaltyPeriod) {
        console.log("Early withdrawal with 10% penalty");
        const penaltyAmount = amount * 0.1;
        const userAmount = amount - penaltyAmount;
        console.log(`Original: ${amount} SOL, Penalty: ${penaltyAmount} SOL, User receives: ${userAmount} SOL`);
      } else if (timeInfo.lockPeriod) {
        throw new Error("Cannot withdraw during lock period (24h - 30 days)");
      } else {
        console.log("Normal withdrawal after 30 days");
        console.log(`User receives: ${amount} SOL`);
      }
      
      // Simulate successful withdrawal
      // TODO: Replace with actual program call using Anchor client
      const mockSignature = "mock_withdrawal_signature_" + Date.now();
      
      return mockSignature;
    } catch (error) {
      console.error("Withdrawal error:", error);
      throw error;
    }
  }

  // New function to get staking time information
  async getStakingTimeInfo() {
    try {
      if (!this.wallet.publicKey) {
        console.log("Wallet not connected, returning null for staking time info");
        return null;
      }
      
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const vaultAccount = await this.connection.getAccountInfo(vault);
      if (!vaultAccount) {
        console.log("Vault not found, returning null for staking time info");
        return null;
      }

      // Parse vault data (you'll need to implement proper deserialization)
      // For now, returning mock data
      const currentTime = Math.floor(Date.now() / 1000);
      const stakeTime = currentTime - 86400; // Mock: staked 24 hours ago
      const unlockTime = stakeTime + 86400; // 24 hours from stake
      const rewardTime = stakeTime + 2592000; // 30 days from stake

      return {
        stakeTime,
        unlockTime,
        rewardTime,
        currentTime,
        timeUntilUnlock: Math.max(0, unlockTime - currentTime),
        timeUntilReward: Math.max(0, rewardTime - currentTime),
        canWithdraw: currentTime >= rewardTime, // Only after 30 days
        canGetReward: currentTime >= rewardTime,
        penaltyPeriod: currentTime < unlockTime, // Within first 24 hours
        lockPeriod: currentTime >= unlockTime && currentTime < rewardTime // 24h to 30 days
      };
    } catch (error) {
      console.error("Get staking time info error:", error);
      return null; // Return null instead of throwing error
    }
  }

  // Function to format time remaining
  formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "Ready";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
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

  async getStakedBalance(mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      
      const mint = new PublicKey(mintAddress);
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const vaultAta = await getAssociatedTokenAddress(mint, vault, true);
      console.log("Vault token account:", vaultAta.toString());
      
      const vaultTokenAccount = await this.connection.getAccountInfo(vaultAta);
      if (!vaultTokenAccount) {
        return "0";
      }
      console.log("Vault token account:", vaultTokenAccount);
      
      const balance = await this.connection.getTokenAccountBalance(vaultAta);
      console.log("Balance:", balance.value.amount);
      return balance.value.amount;
    } catch (error) {
      console.error("Get staked balance error:", error);
      return "0";
    }
  }
}
