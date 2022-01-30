# Create your own index fund and store it on the Solana blockchain

## Prerequisits
Install these dependencies
- Node.js
- [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://project-serum.github.io/anchor/getting-started/installation.html#install-rust)
- Solana browser wallet ([I use Phantom](https://phantom.app/))


## Solana CLI
Set your config to be on devnet: Run `solana config set --url devnet`

## Anchor
Run `anchor build` in the root folder

### Important
Check that the generated key by the anchor build is the same as in the lib.rs, Anchor.toml and App.js files. If not then update them with the generated key.

Run `solana address -k target/deploy/pyth_indexing-keypair.json` to get the generated key.

Deploy the program with the provided command from the anchor build.

## React
Change into the /app directory and run `npm install`. Then run `npm start`.
