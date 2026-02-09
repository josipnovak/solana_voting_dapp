use anchor_lang::prelude::*;

declare_id!("4eY1Ts9nr7zR1PmAny879DzgAyyUZ6wXQFHvKDvwzdJH");

#[program]
pub mod test {
    use super::*;

    pub fn initialize_poll(ctx: Context<InitializePoll>, title: String, options: Vec<String>) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        poll.author = *ctx.accounts.author.key;
        poll.title = title;
        poll.options = options.into_iter().map(|name| PollOption { name, vote_count: 0 }).collect();
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, option_index: u64) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let voter_pubkey = ctx.accounts.voter.key();

        if poll.author == voter_pubkey {
            return err!(MyError::AuthorCannotVote);
        }
        poll.options[option_index as usize].vote_count += 1;
        Ok(())
    }

    pub fn close_poll(_ctx: Context<ClosePoll>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePoll<'info> {
    #[account(init, payer = author, space = 8 + 32 + 100 + 1000)]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
    #[account(
        init, 
        payer = voter, 
        space = 8 + 8, 
        seeds = [b"vote", poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_receipt: Account<'info, VoteReceipt>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Poll {
    pub author: Pubkey,
    pub title: String,
    pub options: Vec<PollOption>, 
}

#[account]
pub struct VoteReceipt {}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PollOption { 
    pub name: String,
    pub vote_count: u64,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(
        mut, 
        close = author,
        has_one = author     
    )]
    pub poll: Account<'info, Poll>,
    
    #[account(mut)]
    pub author: Signer<'info>, 
}

#[error_code]
pub enum MyError {
    #[msg("Autor ankete ne može glasati u vlastitoj anketi.")]
    AuthorCannotVote,
}