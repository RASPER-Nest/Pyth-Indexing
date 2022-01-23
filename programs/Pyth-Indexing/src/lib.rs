use anchor_lang::prelude::*;
mod pc;
use pc::Price;

declare_id!("CxqWzWVdHG9YffvaRUaMnbbeyb7XoHNtxzLNaUpkoyyx");

#[program]
pub mod pyth_indexing {
    use super::*;

    pub fn initialize_storage_account(_ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    pub fn add_pyth_symbol(ctx: Context<Add>, symbol: String) -> ProgramResult {
        let storage = &mut ctx.accounts.storage_account;
        let symbol_copy = symbol.clone();
        // Add passed symbol to vector
        storage.pyth_symbols.push(symbol_copy);

        for symbol in storage.pyth_symbols.iter() {
            msg!("I have this symbol: {}", symbol);
        }

        Ok(())
    }

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

// Init storage account
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 64 + 64)]
    pub storage_account: Account<'info, StorageAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}

// Add symbols to storage
#[derive(Accounts)]
pub struct Add<'info> {
    #[account(mut)]
    pub storage_account: Account<'info, StorageAccount>,
}

// Storage account that holds the symbols and the current average price
#[account]
pub struct StorageAccount {
    pub pyth_symbols: Vec<String>,
    // pub arithmetic_mean_price: f32, 
}