#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use anchor_spl::token::{self,Token,Transfer};

declare_id!("92KUjGGCrEM6kcnMd4pgze3EPnS3PwsXhpDeLB9vGpE9");

#[program]
pub mod anchor_prac {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.vault.owner = ctx.accounts.user.key();
        ctx.accounts.vault.amount = 0;
        ctx.accounts.vault.bump = ctx.bumps.vault;
        ctx.accounts.vault.unlock_time = Clock::get()?.unix_timestamp + 86400;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.vault.amount += amount;
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_ata.to_account_info(),
                to: ctx.accounts.vault_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let clock = Clock::get()?;
    let vault = &mut ctx.accounts.vault;

    // Copy values to avoid borrow checker issues
    let total_amount = vault.amount;
    let owner = vault.owner;
    let bump = vault.bump;

    let signer_seeds = &[
        b"vault",
        owner.as_ref(),
        &[bump],
    ];
    let seeds = &[&signer_seeds[..]];

    // Debug: Print current time vs unlock time
    msg!("Current time: {}, Unlock time: {}", clock.unix_timestamp, vault.unlock_time);
    
    if clock.unix_timestamp < vault.unlock_time {
        msg!("Applying penalty - withdrawing early");
        // 10% fee if before unlock
        let fee_amount = total_amount / 10;
        let user_amount = total_amount - fee_amount;

        // Transfer fee to treasury first
        let cpi_ctx_treasury = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.treasury_ata.to_account_info(),
                authority: vault.to_account_info(),
            },
            seeds,
        );
        token::transfer(cpi_ctx_treasury, fee_amount)?;
        
        // Transfer user share (after fee)
        let cpi_ctx_user = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: vault.to_account_info(),
            },
            seeds,
        );
        token::transfer(cpi_ctx_user, user_amount)?;
    } else {
        msg!("No penalty - withdrawing after lock time");
        // No fee - transfer full amount to user
        let cpi_ctx_user = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.user_ata.to_account_info(),
                authority: vault.to_account_info(),
            },
            seeds,
        );
        token::transfer(cpi_ctx_user, total_amount)?;
    }

    // Mark vault as empty
    vault.amount = 0;

    Ok(())
}

}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub bump: u8,
    pub amount: u64,
    pub unlock_time: i64,
}

#[derive(Accounts)]
#[instruction(airdrop: u64)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [b"vault", user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + 32 + 1 + 8 + 8,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: This is a token account owned by the user (validated manually in instruction)
    #[account(mut)]
    pub user_ata: AccountInfo<'info>,

    /// CHECK: This is a token account owned by the vault PDA (validated manually in instruction)
    #[account(mut)]
    pub vault_ata: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
        #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    ///CHECK user token account
    pub user_ata: AccountInfo<'info>,
    #[account(mut)]
    ///CHECK vault token account
    pub vault_ata: AccountInfo<'info>,
    #[account(mut)]
    ///CHECK treasury token account
    pub treasury_ata:AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[error_code]
pub enum CustomError {
    #[msg("You can't withdraw funds before lock time")]
    VaultLocked,

    #[msg("you can withdraw your funds")]
    GoodToGo,

    #[msg("Vault ATA does not belong to vault.")]
    InvalidVaultOwner,
}
