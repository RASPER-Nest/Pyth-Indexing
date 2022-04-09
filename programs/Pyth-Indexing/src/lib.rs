use anchor_lang::prelude::*;

declare_id!("CxqWzWVdHG9YffvaRUaMnbbeyb7XoHNtxzLNaUpkoyyx");

#[program]
pub mod pyth_indexing {
    use super::*;

    // Pyth index
    pub fn init_index_storage(f_ctx: Context<InitIndexStorage>) -> ProgramResult {
        let index_storage = &mut f_ctx.accounts.storage_account;
        index_storage.id_counter = 0;
        Ok(())
    }

    pub fn create_index(f_ctx: Context<InitIndex>, f_index_name: String, f_pub_keys: Vec<String>) -> ProgramResult {
        let index_storage = &mut f_ctx.accounts.storage_account;
        index_storage.id_counter += 1;

        let index_name_copy = f_index_name.clone();
        let pub_keys_copy = f_pub_keys.clone();

        let new_index = IndexAccount {
            index_id: index_storage.id_counter,
            index_name:  index_name_copy,
            pub_keys: pub_keys_copy,
        };

        index_storage.indices.push(new_index);

        msg!("I hold this amount of indices: {:?}", index_storage.indices.len());

        Ok(())
    }

    pub fn delete_index(f_ctx: Context<InitIndex>, f_id_to_delete: u32) -> ProgramResult {
        let index_storage = &mut f_ctx.accounts.storage_account;

        if let Some(index_pos) = index_storage.indices.iter().position(|i| i.index_id == f_id_to_delete) {
            index_storage.indices.remove(index_pos);
            msg!("Index removed. New amount of indices: {:?}", index_storage.indices.len());
        }
        else {
            msg!("Index not found!");
            return Err(ProgramError::InvalidArgument);
        }

        Ok(())
    }

}

// Init Index storage account
#[derive(Accounts)]
pub struct InitIndexStorage<'info> {
    #[account(init, payer = user, space = 10240)]
    pub storage_account: Account<'info, IndexStorageAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program <'info, System>,
}

// Update index
#[derive(Accounts)]
pub struct InitIndex<'info> {
    #[account(mut)]
    pub storage_account: Account<'info, IndexStorageAccount>,
}

// Index storage
#[account]
pub struct IndexStorageAccount {
    pub id_counter: u32,
    pub indices: Vec<IndexAccount>,
}

// Index
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct IndexAccount {
    pub index_id: u32,
    pub index_name: String,
    pub pub_keys: Vec<String>,
}