use crate::*;
use anchor_lang::prelude::AccountInfo;
use bytemuck::{cast_slice_mut, cast_slice, from_bytes, try_cast_slice, from_bytes_mut, try_cast_slice_mut, Pod, PodCastError, Zeroable};
use std::cell::RefMut;
use borsh::{BorshDeserialize, BorshSerialize};
use std::mem::size_of;

// Price struct similar to Pyth price account struct
#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize)]
#[repr(C)]
pub struct PriceStruct {
    pub expo: i32,
    pub price: i64,
    // ToDos:
    // pub conf: u64,
    // pub status: PriceStatus, 
    // time stamp
}

#[derive(Default, Copy, Clone, Debug)]
#[repr(C)]
pub struct AccKey {
    pub val: [u8; 32],
}

#[derive(Copy, Clone, Debug, BorshDeserialize, BorshSerialize)]
#[repr(C)]
pub enum PriceStatus {
    Unknown,
    Trading,
    Halted,
    Auction,
}

impl Default for PriceStatus {
    fn default() -> Self {
        PriceStatus::Trading
    }
}

#[derive(Copy, Clone, Debug)]
#[repr(C)]
pub enum CorpAction {
    NoCorpAct,
}

impl Default for CorpAction {
    fn default() -> Self {
        CorpAction::NoCorpAct
    }
}

#[derive(Default, Copy, Clone, Debug)]
#[repr(C)]
pub struct PriceInfo {
    pub price: i64,
    pub conf: u64,
    pub status: PriceStatus,
    pub corp_act: CorpAction,
    pub pub_slot: u64,
}
#[derive(Default, Copy, Clone)]
#[repr(C)]
pub struct PriceComp {
    publisher: AccKey,
    agg: PriceInfo,
    latest: PriceInfo,
}

#[derive(Copy, Clone)]
#[repr(C)]
pub enum PriceType {
    Unknown,
    Price,
    TWAP,
    Volatility,
}

impl Default for PriceType {
    fn default() -> Self {
        PriceType::Price
    }
}

#[derive(Default, Copy, Clone)]
#[repr(C)]
pub struct Price {
    pub magic: u32,       // Pyth magic number.
    pub ver: u32,         // Program version.
    pub atype: u32,       // Account type.
    pub size: u32,        // Price account size.
    pub ptype: PriceType, // Price or calculation type.
    pub expo: i32,        // Price exponent.
    pub num: u32,         // Number of component prices.
    pub unused: u32,
    pub curr_slot: u64,        // Currently accumulating price slot.
    pub valid_slot: u64,       // Valid slot-time of agg. price.
    pub twap: i64,             // Time-weighted average price.
    pub avol: u64,             // Annualized price volatility.
    pub drv0: i64,             // Space for future derived values.
    pub drv1: i64,             // Space for future derived values.
    pub drv2: i64,             // Space for future derived values.
    pub drv3: i64,             // Space for future derived values.
    pub drv4: i64,             // Space for future derived values.
    pub drv5: i64,             // Space for future derived values.
    pub prod: AccKey,          // Product account key.
    pub next: AccKey,          // Next Price account in linked list.
    pub agg_pub: AccKey,       // Quoter who computed last aggregate price.
    pub agg: PriceInfo,        // Aggregate price info.
    pub comp: [PriceComp; 32], // Price components one per quoter.
}

impl Price {
    #[inline]
    pub fn load<'a>(price_feed: &'a AccountInfo) -> Result<RefMut<'a, Price>, ProgramError> {
        let account_data: RefMut<'a, [u8]>;
        let state: RefMut<'a, Self>;

        account_data = RefMut::map(price_feed.try_borrow_mut_data().unwrap(), |data| *data);

        state = RefMut::map(account_data, |data| {
            from_bytes_mut(cast_slice_mut::<u8, u8>(try_cast_slice_mut(data).unwrap()))
        });
        Ok(state)
    }
}

#[cfg(target_endian = "little")]
unsafe impl Zeroable for Price {}

#[cfg(target_endian = "little")]
unsafe impl Pod for Price {}

pub const MAGIC          : u32   = 0xa1b2c3d4;
pub const VERSION_2      : u32   = 2;
pub const VERSION        : u32   = VERSION_2;
pub const MAP_TABLE_SIZE : usize = 640;
pub const PROD_ACCT_SIZE : usize = 512;
pub const PROD_HDR_SIZE  : usize = 48;
pub const PROD_ATTR_SIZE : usize = PROD_ACCT_SIZE - PROD_HDR_SIZE;

/// The type of Pyth account determines what data it contains
#[derive(Copy, Clone)]
#[repr(C)]
pub enum AccountType
{
  Unknown,
  Mapping,
  Product,
  Price
}

/// Mapping accounts form a linked-list containing the listing of all products on Pyth.
#[derive(Copy, Clone)]
#[repr(C)]
pub struct Mapping
{
  /// pyth magic number
  pub magic      : u32,
  /// program version
  pub ver        : u32,
  /// account type
  pub atype      : u32,
  /// account used size
  pub size       : u32,
  /// number of product accounts
  pub num        : u32,
  pub unused     : u32,
  /// next mapping account (if any)
  pub next       : AccKey,
  pub products   : [AccKey;MAP_TABLE_SIZE]
}

impl Mapping {
    #[inline]
    pub fn load<'a>(mapping_account: &'a AccountInfo) -> Result<RefMut<'a, Mapping>, ProgramError> {
        let account_data: RefMut<'a, [u8]>;
        let state: RefMut<'a, Self>;

        account_data = RefMut::map(mapping_account.try_borrow_mut_data().unwrap(), |data| *data);

        state = RefMut::map(account_data, |data| {
            from_bytes_mut(cast_slice_mut::<u8, u8>(try_cast_slice_mut(data).unwrap()))
        });
        Ok(state)
    }
}

#[cfg(target_endian = "little")]
unsafe impl Zeroable for Mapping {}

#[cfg(target_endian = "little")]
unsafe impl Pod for Mapping {}

/// Product accounts contain metadata for a single product, such as its symbol ("Crypto.BTC/USD")
/// and its base/quote currencies.
#[derive(Copy, Clone)]
#[repr(C)]
pub struct Product
{
  /// pyth magic number
  pub magic      : u32,
  /// program version
  pub ver        : u32,
  /// account type
  pub atype      : u32,
  /// price account size
  pub size       : u32,
  /// first price account in list
  pub px_acc     : AccKey,
  /// key/value pairs of reference attr.
  pub attr       : [u8;PROD_ATTR_SIZE]
}

impl Product {
    #[inline]
    pub fn load<'a>(product_account: &'a AccountInfo) -> Result<RefMut<'a, Product>, ProgramError> {
        let account_data: RefMut<'a, [u8]>;
        let state: RefMut<'a, Self>;

        account_data = RefMut::map(product_account.try_borrow_mut_data().unwrap(), |data| *data);

        state = RefMut::map(account_data, |data| {
            from_bytes_mut(cast_slice_mut::<u8, u8>(try_cast_slice_mut(data).unwrap()))
        });
        Ok(state)
    }
}

#[cfg(target_endian = "little")]
unsafe impl Zeroable for Product {}

#[cfg(target_endian = "little")]
unsafe impl Pod for Product {}


#[derive(Copy, Clone)]
struct AccKeyU64
{
  pub val: [u64;4]
}

#[cfg(target_endian = "little")]
unsafe impl Zeroable for AccKeyU64 {}

#[cfg(target_endian = "little")]
unsafe impl Pod for AccKeyU64 {}

impl AccKey
{
  pub fn is_valid( &self ) -> bool  {
    match load::<AccKeyU64>( &self.val ) {
      Ok(k8) => k8.val[0]!=0 || k8.val[1]!=0 || k8.val[2]!=0 || k8.val[3]!=0,
      Err(_) => false,
    }
  }
}

fn load<T: Pod>(data: &[u8]) -> Result<&T, PodCastError> {
    let size = size_of::<T>();
    if data.len() >= size {
      Ok(from_bytes(cast_slice::<u8, u8>(try_cast_slice(
        &data[0..size],
      )?)))
    } else {
      Err(PodCastError::SizeMismatch)
    }
  }