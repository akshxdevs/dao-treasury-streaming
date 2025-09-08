import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorPrac } from "../target/types/anchor_prac";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("token-locker-penalty", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.anchorPrac as Program<AnchorPrac>;

  const user = provider.wallet;
  let mint: anchor.web3.PublicKey;
  let userAta: anchor.web3.PublicKey;
  let vaultAta: anchor.web3.PublicKey;
  let treasuryAta: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let bump: number;

  const DEPOSIT_AMOUNT = 1_000_000;

  it("Initializes vault", async () => {
    mint = await createMint(
      provider.connection,
      user.payer,
      user.publicKey,
      null,
      6
    );

    userAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user.payer,
        mint,
        user.publicKey
      )
    ).address;

    const [vaultPDA, _bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );
    vault = vaultPDA;
    bump = _bump;

    vaultAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user.payer,
        mint,
        vault,
        true
      )
    ).address;

    // Create a separate treasury account
    const treasury = anchor.web3.Keypair.generate();
    treasuryAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        user.payer,
        mint,
        treasury.publicKey
      )
    ).address;

    await program.methods
      .initialize(new anchor.BN(5)) // 5 seconds lock
      .accounts({
        vault,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await mintTo(
      provider.connection,
      user.payer,
      mint,
      userAta,
      user.publicKey,
      DEPOSIT_AMOUNT
    );
  });

  it("Deposits into vault", async () => {
    await program.methods
      .deposit(new anchor.BN(DEPOSIT_AMOUNT))
      .accounts({
        vault,
        user: user.publicKey,
        userAta,
        vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const userInfo = await getAccount(provider.connection, userAta);
    console.log("User Balance: ", Number(userInfo.amount));
  });

  it("Withdraws early with penalty", async () => {
    const userVaultInfo = await getAccount(provider.connection, userAta);
    const treasuryInfo = await getAccount(provider.connection, treasuryAta);

    console.log("Before withdraw");

    console.log("User Balance: ", Number(userVaultInfo.amount));
    console.log("Treasury Balance: ", Number(treasuryInfo.amount));

    await program.methods
      .withdraw()
      .accounts({
        vault,
        user: user.publicKey,
        userAta,
        vaultAta,
        treasuryAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("After withdraw");
    const userAfter = await getAccount(provider.connection, userAta);
    const treasuryAfter = await getAccount(provider.connection, treasuryAta);
    console.log("User Balance: ", Number(userAfter.amount) / 1_000_000 + "SOL");
    console.log(
      "Treasury Balance: ",
      Number(treasuryAfter.amount) / 1_000_000 + "SOL"
    );
    assert.strictEqual(Number(userAfter.amount), 900_000);
    assert.strictEqual(Number(treasuryAfter.amount), 100_000);
  });
});
