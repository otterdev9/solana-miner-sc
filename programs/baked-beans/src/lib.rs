use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod states;
pub mod utils;

use instructions::*;

declare_id!("4Krw6BFxF5GN7ud6ui6Un8kdmL56wsL71BxtqxoAo9ro");
#[program]
pub mod sol_miner {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, new_authority: Pubkey) -> Result<()> {
        initialize::handle(ctx, new_authority)
    }

    pub fn buy_eggs(ctx: Context<BuyEggs>, amount: u64) -> Result<()> {
        buy_eggs::handle(ctx, amount)
    }

    pub fn sell_eggs(ctx: Context<SellEggs>) -> Result<()> {
        sell_eggs::handle(ctx)
    }

    pub fn hatch_eggs(ctx: Context<HatchEggs>) -> Result<()> {
        hatch_eggs::handle(ctx)
    }

    pub fn set_config(ctx: Context<SetConfig>, amount: u64) -> Result<()> {
        set_config::handle(ctx, amount)
    }

    pub fn start_mine(ctx: Context<StartMine>) -> Result<()> {
        start_mine::handle(ctx)
    }

    pub fn set_treasury(ctx: Context<SetTreasury>, key: Pubkey, dev_fee: u64, multiplier: u64, divider: u64) -> Result<()> {
        set_treasury::handle(ctx, key, dev_fee, multiplier, divider)
    }
}
