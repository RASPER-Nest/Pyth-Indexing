import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PythIndexing } from '../target/types/pyth_indexing';

// Not touched yet

describe('Pyth-Indexing', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.PythIndexing as Program<PythIndexing>;

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
