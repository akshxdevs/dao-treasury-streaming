use anchor_lang::prelude::*;

declare_id!("DhLLJR45XC9jGSgSigAi86SWf4qzZkztc1iayFQDAj8u");

#[program]
pub mod doa_treasury {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
