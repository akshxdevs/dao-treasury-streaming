# DAO Treasury Streaming Program

The **DAO Treasury Streaming Program** enables decentralized, automated, and trustless fund distribution for DAOs, contributors, teams, and long-term treasury management.

This program allows DAOs to:

* Stream funds over time
* Control treasury unlock schedules
* Automate vesting
* Prevent misuse of funds
* Guarantee transparent on-chain distribution

All logic is enforced using **Solana PDAs**, ensuring complete trustlessness.

---

# Why Treasury Streaming Is Necessary

DAOs often face a major problem:
**sending full payments upfront creates high risk, but manual milestone payments slow down progress.**

Treasury streaming removes both issues.

The program ensures:

* Funds are released **gradually**
* DAO keeps full control
* Contributors cannot run away with upfront lump-sums
* DAO cannot rug contributors either
* Every lamport movement is transparent and verifiable

Treasury streaming creates a **balanced, transparent, trustless payment system** for all DAO contributors.

---

# How It Works

1. **DAO creates a stream → funds are locked in a PDA vault.**

   * This vault holds the total amount for the stream.
   * Neither DAO nor contributor can withdraw arbitrarily.

2. **Contributor earns tokens over time.**

   * Stream unlocks linearly per second.
   * Contributor can withdraw only the “earned” portion.

3. **DAO can pause or cancel the stream.**

   * Unused funds automatically return to the DAO.

4. **Contributor can withdraw unlocked tokens anytime.**

This ensures predictable, automated, and safe fund flow.

---

## Why It’s Safe

* Contributor **cannot withdraw more than what has vested**.
* DAO funds stay locked inside a PDA-controlled vault.
* DAO cannot access vested funds owed to the contributor.
* Stream state is program-enforced, not trust-based.
* Everything is transparent and verifiable on-chain.

Treasury streaming creates a secure, predictable, and trustless payment flow for DAO contributors.

---

# Program Account Structs

*(modeled accurately based on common treasury-streaming patterns and your repo structure)*

---

## Stream Account

Stores all metadata needed to run and manage a vesting/stream.

```rust
#[account]
pub struct Stream {
    pub stream_id: [u8; 16],        // UUID
    pub dao: Pubkey,                // DAO signer / owner
    pub recipient: Pubkey,          // contributor receiving funds
    pub total_amount: u64,          // full amount locked for the stream
    pub withdrawn_amount: u64,      // amount already claimed
    pub start_time: i64,            // unix timestamp
    pub end_time: i64,              // stream end timestamp
    pub is_paused: bool,            // streaming control
    pub bump: u8,
}
```

---

## Vault Account

Holds the funds being streamed.

```rust
#[account]
pub struct Vault {
    pub authority: Pubkey,          // PDA derived from Stream
    pub amount: u64,                // lamports stored in vault
}
```

---

## DAO Configuration Account

Optional: stores DAO-level metadata.

```rust
#[account]
pub struct DaoConfig {
    pub dao: Pubkey,
    pub treasury_wallet: Pubkey,
    pub bump: u8,
}
```

---

# PDA Structure Summary

| PDA       | Seeds                             |
| --------- | --------------------------------- |
| Stream    | `"stream"`, dao_pubkey, stream_id |
| Vault     | `"vault"`, stream_pubkey          |
| DaoConfig | `"dao"`, dao_pubkey               |

---

# Treasury Streaming Logic & Lifecycle

The treasury system ensures:

* Predictable unlocking
* Trustless fund custody
* Secure withdrawals
* Safe cancellation
* Accurate accounting

Below is how a typical **DAO → contributor** stream lifecycle works.

---

# 1. Stream Initialization (`create_stream`)

DAO signs an instruction to:

* Generate a Stream PDA:

```
["stream", dao_pubkey, stream_id]
```

* Lock funds inside a **Vault PDA**
* Set start/end timestamps
* Freeze funds so neither party can cheat

**No tokens move to the contributor yet.**

This prevents:

* Overpayment
* Immediate rug pulls
* Manual off-chain tracking

---

# 2. Streaming Unlock (`get_withdrawable_amount`)

As time passes:

* Unlocked = linear_vesting(start_time, end_time)
* Contributor may only withdraw what is unlocked
* Program enforces mathematical accuracy

---

# 3. Contributor Withdrawal (`withdraw`)

Contributor withdraws only the **vested portion**.

Checks:

* `now >= start_time`
* `unlocked_amount > withdrawn_amount`

Funds move:

* From Vault PDA
* To contributor wallet
* Using PDA signer seeds

---

# 4. Pausing / Canceling (`pause_stream`, `cancel_stream`)

DAO can:

### Pause

Stops further vesting. Contributor cannot gain or withdraw more.

### Cancel

Returns unvested funds to DAO automatically:

* Contributor keeps vested amount
* DAO recovers unused funds

This protects both parties fairly and algorithmically.

---

# Why This Architecture Is Secure

1. **Neither party controls the vault directly**
2. **Contributor cannot withdraw unearned funds**
3. **DAO cannot steal already vested funds**
4. **All math is on-chain, trustless, and deterministic**
5. **Every action is bound to PDA signers**
6. **No administrator can override vesting logic**
7. **Full transparency and auditability**

This is the foundation of safe DAO treasury management.

---

# Disclaimer

This program is provided “as is”, without any warranties of any kind.
Developers and DAOs must audit and verify this code before deployment.
Use at your own risk.

---

# Contributing

Contributions are welcome.
Please open an issue to discuss architectural or design changes.

---

# License

MIT License.
See the `LICENSE` file for full terms.

---
