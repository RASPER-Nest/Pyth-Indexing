use anchor_lang::prelude::*;
mod pc;
use pc::Price;
use pc::Product;
use pc::Mapping;
use pc::PriceStatus;
use pc::MAGIC;
use pc:: VERSION_2;
use pc::AccountType;

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

        let pyth_product = &ctx.accounts.pyth_prod_acnt;
        let product_account = Product::load(&pyth_product).unwrap();
        let pyth_price = &ctx.accounts.pyth_price_acnt;
        let price_account = Price::load(&pyth_price).unwrap();

        // Security checks
        if product_account.magic != MAGIC {
            msg!("Pyth product account provided is not a valid Pyth account");
            return Err(ProgramError::InvalidArgument.into());
        }
        if product_account.atype != AccountType::Product as u32 {
            msg!("Pyth product account provided is not a valid Pyth product account");
            return Err(ProgramError::InvalidArgument.into());
        }
        if product_account.ver != VERSION_2 {
            msg!("Pyth product account provided has a different version than the Pyth client");
            return Err(ProgramError::InvalidArgument.into());
        }
        if !product_account.px_acc.is_valid() {
            msg!("Pyth product price account is invalid");
            return Err(ProgramError::InvalidArgument.into());
        }
    
        let pyth_price_pubkey = Pubkey::new(&pyth_product.px_acc.val);
        if &pyth_price_pubkey != pyth_price_info.key {
            msg!("Pyth product price account does not match the Pyth price provided");
            return Err(ProgramError::InvalidArgument.into());
        }

        for product in mapping_account.products.iter() {
            let product_pkey = Pubkey::new( &product.val );
            let product_account = Product::load(&product_pkey).unwrap();
        }

        Ok(())
    }

    pub fn show_pyth_price(ctx: Context<Pyth>) -> ProgramResult {
        let oracle = &ctx.accounts.pyth_account;

        let price_oracle = Price::load(&oracle).unwrap();
        msg!("Hello Pyth price account!");
        msg!("Product account key: {:?}", price_oracle.prod);
        msg!("Price account status: {:?}", price_oracle.agg.status);
        msg!("Exponent: {:?}", price_oracle.expo);
        msg!("Price (needs to be multiplied with 10^(exp)): {:?}", price_oracle.agg.price);
        msg!("Confidence (needs to be multiplied with 10^(exp)): {:?}", price_oracle.agg.conf);
        
        Ok(())
    }

    pub fn show_pyth_mapping(ctx: Context<Pyth>) -> ProgramResult {
        let oracle = &ctx.accounts.pyth_account;

        let mapping_account = Mapping::load(&oracle).unwrap();
        msg!("Hello Pyth mapping account!");
        msg!("Magic number: {:?}", mapping_account.magic);
        msg!("Program version: {:?}", mapping_account.ver);
        msg!("Account type: {:?}", mapping_account.atype);
        msg!("Account used size: {:?}", mapping_account.size);
        msg!("Number of product accounts: {:?}", mapping_account.num);
        msg!("Number of product accounts unused: {:?}", mapping_account.unused);
        msg!("Next mapping account (if any): {:?}", mapping_account.next);

        // Cannot show the whole products array due to max. limit of compute units (=200.000)
        // Therefore show only the next 10 products
        if mapping_account.products.len() >= 10 {
            let ten_products = &mapping_account.products[0..9];
            msg!("Next mapping account for products: {:?}", ten_products);

            for product in ten_products.iter() {
                let prod_pkey = Pubkey::new( &product.val );
                msg!("The derived public key of the product is: {:?}", prod_pkey);
            }
        }
        
        Ok(())
    }

}

// Pyth struct
#[derive(Accounts)]
pub struct Pyth<'info> {
    pub pyth_account : AccountInfo<'info>,
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
    pub pyth_prod_acnt : AccountInfo<'info>,
    pub pyth_price_acnt : AccountInfo<'info>,
    #[account(mut)]
    pub storage_account: Account<'info, StorageAccount>,
}

// Storage account that holds the symbols and the current average price
#[account]
pub struct StorageAccount {
    pub pyth_symbols: Vec<String>,
    pub pyth_elements: Vec<PythPrice>,
}

// Pyth struct
#[account]
pub struct PythPrice {
    pub symbol: String,
    pub expo: i32,
    pub price: i64,
    pub conf: u64,
    pub status: PriceStatus, 
}