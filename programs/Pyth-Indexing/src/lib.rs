use anchor_lang::prelude::*;
mod pc;
use pc::Price;

declare_id!("CxqWzWVdHG9YffvaRUaMnbbeyb7XoHNtxzLNaUpkoyyx");

#[program]
pub mod pyth_indexing {

    use super::*;

    pub fn show_pyth_price(ctx: Context<Pyth>) -> ProgramResult {
        let oracle = &ctx.accounts.price;

        let price_oracle = Price::load(&oracle).unwrap();
        msg!("Hello Pyth!");
        msg!("Product account key: {:?}", price_oracle.prod);
        msg!("Price account status: {:?}", price_oracle.agg.status);
        msg!("Exponent: {:?}", price_oracle.expo);
        msg!("Price (needs to be multiplied with 10^(exp)): {:?}", price_oracle.agg.price);
        msg!("Confidence (needs to be multiplied with 10^(exp)): {:?}", price_oracle.agg.conf);
        
        Ok(())
    }

}

// Pyth struct
#[derive(Accounts)]
pub struct Pyth<'info> {
    pub price : AccountInfo<'info>,
}