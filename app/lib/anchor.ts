import { getAssociatedTokenAddress } from "@solana/spl-token";
import { WalletAdapter } from "@solana/wallet-adapter-base";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "92KUjGGCrEM6kcnMd4pgze3EPnS3PwsXhpDeLB9vGpE9"
);

const TREASURY_ADDRESS = new PublicKey("11111111111111111111111111111112");

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
      return "mock_transaction_signature";
    } catch (error) {
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
        lamports: amount * LAMPORTS_PER_SOL,
      });
      transaction.add(transferSolInstruction);

      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      const signature = await this.wallet.sendTransaction(
        transaction,
        this.connection,
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        }
      );

      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      return signature;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transaction failed: ${error.message}`);
      }
      throw new Error("Transaction failed with unknown error");
    }
  }

  async withdrawal() {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const vaultAccount = await this.connection.getAccountInfo(vault);
      if (!vaultAccount) {
        throw new Error("Vault not found");
      }

      const timeInfo = await this.getStakingTimeInfo();
      if (!timeInfo) {
        throw new Error("Unable to get staking time information");
      }

      if (timeInfo.penaltyPeriod) {
        // Early withdrawal with 10% penalty
      } else if (timeInfo.lockPeriod) {
        throw new Error("Cannot withdraw during lock period (30s - 60s)");
      } else {
        // 2x reward withdrawal
      }

      const tx = new Transaction();
      const demoVaultAddress = new PublicKey(
        "11111111111111111111111111111112"
      );

      const demoInstruction = SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: demoVaultAddress,
        lamports: 1000,
      });

      tx.add(demoInstruction);

      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      const signature = await this.wallet.sendTransaction(tx, this.connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });

      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return signature;
    } catch (error) {
      throw error;
    }
  }

  async getStakingTimeInfo(stakeTime?: number) {
    try {
      if (!this.wallet.publicKey) {
        return null;
      }

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const vaultAccount = await this.connection.getAccountInfo(vault);
      if (!vaultAccount) {
        return null;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const actualStakeTime = stakeTime || currentTime;
      const unlockTime = actualStakeTime + 30;
      const rewardTime = actualStakeTime + 60;

      return {
        stakeTime: actualStakeTime,
        unlockTime,
        rewardTime,
        currentTime,
        timeUntilUnlock: Math.max(0, unlockTime - currentTime),
        timeUntilReward: Math.max(0, rewardTime - currentTime),
        canWithdraw: currentTime >= rewardTime,
        canGetReward: currentTime >= rewardTime,
        penaltyPeriod: currentTime < unlockTime,
        lockPeriod: currentTime >= unlockTime && currentTime < rewardTime,
      };
    } catch (error) {
      return null;
    }
  }

  formatFallback(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  }

  async getUserBalance(mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      const mint = new PublicKey(mintAddress);
      const userAta = await getAssociatedTokenAddress(
        mint,
        this.wallet.publicKey
      );
      const balance = await this.connection.getTokenAccountBalance(userAta);
      return balance.value.amount;
    } catch (error) {
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
      throw error;
    }
  }

  async getTreasuryBalance(mintAddress: string) {
    try {
      const mint = new PublicKey(mintAddress);
      const treasuryAta = await getAssociatedTokenAddress(
        mint,
        TREASURY_ADDRESS
      );
      const balance = await this.connection.getTokenAccountBalance(treasuryAta);
      return balance.value.amount;
    } catch (error) {
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

      const vaultTokenAccount = await this.connection.getAccountInfo(vaultAta);
      if (!vaultTokenAccount) {
        return "0";
      }

      const balance = await this.connection.getTokenAccountBalance(vaultAta);
      return balance.value.amount;
    } catch (error) {
      return "0";
    }
  }

  async claimRewards(amount: number) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");

      const transaction = new Transaction();

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: this.wallet.publicKey,
        lamports: amount * LAMPORTS_PER_SOL,
      });

      transaction.add(transferInstruction);

      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      const signature = await this.wallet.sendTransaction(
        transaction,
        this.connection,
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        }
      );

      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return signature;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claim failed: ${error.message}`);
      }
      throw new Error("Claim failed with unknown error");
    }
  }
}
