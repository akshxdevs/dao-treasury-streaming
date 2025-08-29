import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
const PROGRAM_ID = new PublicKey(
  "92KUjGGCrEM6kcnMd4pgze3EPnS3PwsXhpDeLB9vGpE9"
);

const TREASURY_ADDRESS = new PublicKey(
  "11111111111111111111111111111112"
);

export class AnchorCLient {
  private connection: Connection;
  private wallet: WalletContextState;
  constructor(wallet: WalletContextState) {
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
      if (!this.wallet.signTransaction) throw new Error("Wallet cannot sign transactions");
      
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
      
      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        userAta,           // from: user's token account
        vaultAta,          // to: vault's token account
        this.wallet.publicKey, // owner: user
        amount             // amount to transfer
      );
      
      // Create transaction
      const transaction = new Transaction().add(transferInstruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      // Sign transaction
      const signedTransaction = await this.wallet.signTransaction(transaction);
      
      // Send transaction
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      console.log("Deposit transaction successful:", signature);
      return signature;
    } catch (error) {
      console.error("Deposit error:", error);
      throw error;
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