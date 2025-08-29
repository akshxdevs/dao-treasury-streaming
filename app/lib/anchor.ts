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
      
      const mint = new PublicKey(mintAddress);
      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), this.wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      console.log("Vault address:", vault.toString());
      
      const userAta = await getAssociatedTokenAddress(
        mint,
        this.wallet.publicKey
      );
      const vaultAta = await getAssociatedTokenAddress(mint, vault, true);
      
      console.log("User ATA:", userAta.toString());
      console.log("Vault ATA:", vaultAta.toString());
      
      // Check if user has the token account
      const userTokenAccount = await this.connection.getAccountInfo(userAta);
      
      // Create transaction
      const transaction = new Transaction();
      
      // If user doesn't have token account, create it first
      if (!userTokenAccount) {
        console.log("Creating user token account...");
        const createAtaInstruction = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,  // payer
          userAta,                 // associated token account
          this.wallet.publicKey,   // owner
          mint                     // mint
        );
        transaction.add(createAtaInstruction);
      }
      
      // Check if vault token account exists, if not create it
      const vaultTokenAccount = await this.connection.getAccountInfo(vaultAta);
      if (!vaultTokenAccount) {
        console.log("Creating vault token account...");
        const createVaultAtaInstruction = createAssociatedTokenAccountInstruction(
          this.wallet.publicKey,  // payer
          vaultAta,                // associated token account
          vault,                   // owner (vault)
          mint                     // mint
        );
        transaction.add(createVaultAtaInstruction);
      }
      
      // Check user's SOL balance (for native SOL) or token balance
      let userBalanceAmount: number;
      if (mintAddress === "So11111111111111111111111111111111111111112") {
        // For wrapped SOL, check SOL balance
        const solBalance = await this.connection.getBalance(this.wallet.publicKey);
        userBalanceAmount = solBalance / LAMPORTS_PER_SOL;
        console.log("User SOL balance:", userBalanceAmount);
      } else {
        // For other tokens, check token balance
        const userBalance = await this.connection.getTokenAccountBalance(userAta);
        userBalanceAmount = Number(userBalance.value.amount);
        console.log("User token balance:", userBalanceAmount);
      }
      
      console.log("Requested amount:", amount);
      
      if (userBalanceAmount < amount) {
        throw new Error(`Insufficient balance. You have ${userBalanceAmount} ${mintAddress === "So11111111111111111111111111111111111111112" ? "SOL" : "tokens"}, but trying to stake ${amount}`);
      }
      
      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        userAta,           // from: user's token account
        vaultAta,          // to: vault's token account
        this.wallet.publicKey, // owner: user
        amount             // amount to transfer
      );
      
      transaction.add(transferInstruction);
      
      console.log("Transfer instruction created");
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      console.log("Transaction prepared, sending...");
      
      // Send transaction using wallet adapter (handles signing internally)
      const signature = await this.wallet.sendTransaction(transaction, this.connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3
      });
      
      console.log("Transaction sent, signature:", signature);
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      console.log("Deposit transaction successful:", signature);
      return signature;
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
