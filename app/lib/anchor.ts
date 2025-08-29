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

  async getStakedBalance(mintAddress: string) {
    try {
      if (!this.wallet.publicKey) throw new Error("Wallet not connected");
      
      const mint = new PublicKey(mintAddress);
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const vaultAta = await getAssociatedTokenAddress(mint, vault, true);
      
      // Check if vault token account exists
      const vaultTokenAccount = await this.connection.getAccountInfo(vaultAta);
      if (!vaultTokenAccount) {
        return "0"; // No staked balance if vault doesn't exist
      }
      
      const balance = await this.connection.getTokenAccountBalance(vaultAta);
      return balance.value.amount;
    } catch (error) {
      console.error("Get staked balance error:", error);
      return "0";
    }
  }
}
