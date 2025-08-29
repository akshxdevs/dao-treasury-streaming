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

      let withdrawalAmount = amount;
      let feeAmount = 0;

      // Calculate withdrawal amount based on time rules
      if (timeInfo.penaltyPeriod) {
        console.log("Early withdrawal with 10% penalty");
        feeAmount = amount * 0.1;
        withdrawalAmount = amount - feeAmount;
        console.log(`Original: ${amount} SOL, Penalty: ${feeAmount} SOL, User receives: ${withdrawalAmount} SOL`);
      } else if (timeInfo.lockPeriod) {
        throw new Error("Cannot withdraw during lock period (24h - 30 days)");
      } else {
        console.log("2x reward withdrawal after 30 days");
        withdrawalAmount = amount * 2;
        console.log(`User receives: ${withdrawalAmount} SOL (2x reward)`);
      }

      // Create a real transaction to demonstrate the withdrawal
      // This will show up in your wallet activity as a real transaction
      const tx = new Transaction();
      
      // Create a demo address to simulate the vault
      const demoVaultAddress = new PublicKey("11111111111111111111111111111112"); // System Program ID as demo
      
      // Send a small amount to simulate the withdrawal (this will show in wallet activity)
      const demoInstruction = SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: demoVaultAddress,
        lamports: 1000 // Small amount to show transaction
      });
      
      tx.add(demoInstruction);

      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      console.log(`Processing withdrawal simulation - you will see a transaction in your wallet...`);
      
      const signature = await this.wallet.sendTransaction(tx, this.connection, {
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

      console.log(`Withdrawal simulation successful! Signature: ${signature}`);
      console.log(`In real implementation, you would receive: ${withdrawalAmount} SOL`);
      
      return signature;
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
      
      // Mock different scenarios for testing:
      // 1. Early withdrawal period (within 24h) - stakeTime = currentTime - 3600 (1 hour ago)
      // 2. Lock period (24h-30 days) - stakeTime = currentTime - 86400 (24 hours ago) 
      // 3. Reward period (after 30 days) - stakeTime = currentTime - 2592000 (30 days ago)
      
      const stakeTime = currentTime - 3600; // Mock: staked 1 hour ago (within 24h window)
      const unlockTime = stakeTime + 86400; // 24 hours from stake
      const rewardTime = stakeTime + 2592000; // 30 days from stake

      console.log("Mock staking time info:", {
        currentTime: new Date(currentTime * 1000).toLocaleString(),
        stakeTime: new Date(stakeTime * 1000).toLocaleString(),
        unlockTime: new Date(unlockTime * 1000).toLocaleString(),
        rewardTime: new Date(rewardTime * 1000).toLocaleString(),
        penaltyPeriod: currentTime < unlockTime,
        lockPeriod: currentTime >= unlockTime && currentTime < rewardTime,
        canGetReward: currentTime >= rewardTime
      });

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
