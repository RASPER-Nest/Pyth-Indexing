import './App.css';
import { useState, React } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import screenshot from './programLogScreenshot.png';
import { parseMappingData, Magic, Version } from './PythTypes.ts';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
require('@solana/wallet-adapter-react-ui/styles.css');

const wallets = [ getPhantomWallet() ]

const { SystemProgram, Keypair } = web3;
const storageAccount = Keypair.generate();

const opts = {
  preflightCommitment: "processed"
}
const programIDString = "CxqWzWVdHG9YffvaRUaMnbbeyb7XoHNtxzLNaUpkoyyx";
const programID = new PublicKey(programIDString);

function App() {
  const [value, setValue] = useState('');
  const [dataList, setDataList] = useState([]);
  const [input, setInput] = useState('');
  const [inputPyth, setInputPyth] = useState('');
  const [inputPythMapping, setInputPythMapping] = useState('');
  const [inputAssetName, setInputAssetName] = useState('');
  const wallet = useWallet();

  async function getProvider() {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    // localhost:
    // const network = "http://127.0.0.1:8899";
    // devnet:    
    const network = clusterApiUrl('devnet');
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  async function initializeStorageAccount() {    
    const provider = await getProvider();
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    try {
      /* interact with the program via rpc */
      await program.rpc.initializeStorageAccount({
        accounts: {
          storageAccount: storageAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [storageAccount]
      });
    } catch (err) {
        console.log("Transaction error: ", err);
      }
  }

  async function addPythSymbol() {
    if (!input) return
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    await program.rpc.addPythSymbol(input, {
      accounts: {
        storageAccount: storageAccount.publicKey
      }
    });

    // const storage_account = await program.account.storageAccount.fetch(storageAccount.publicKey);
    // console.log('account: ', storage_account);
    // setDataList(storage_account.pyth_symbols);
    // setInput('');
  }

  async function showPythPrice() {
    if (!inputPyth) return
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    const priceAccount = new PublicKey(inputPyth);
    await program.rpc.showPythPrice({accounts: { pythAccount: priceAccount },});
  }

  async function showPythMapping() {
    if (!inputPythMapping) return
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    const mappingAccount = new PublicKey(inputPythMapping);
    await program.rpc.showPythMapping({accounts: { pythAccount: mappingAccount },});
  }

  async function getPythMappingAccount() {

    const url = clusterApiUrl('devnet')
    const oraclePublicKey = 'BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2'
    const connection = new Connection(url)
    const publicKey = new PublicKey(oraclePublicKey)
    connection
      .getAccountInfo(publicKey)
      .then((accountInfo) => {
        if (accountInfo && accountInfo.data) {
          const mapping = parseMappingData(accountInfo.data)
          console.log(mapping)
          expect(mapping.magic).toBe(Magic)
          expect(mapping.version).toBe(Version)
        } else {
          console.log("Shit happened: No Mapping account")
        }
      })

    // const provider = await getProvider();
    // const oraclePublicKey = 'BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2'
    // const connection = new Connection(url)
    // const publicKey = new PublicKey(oraclePublicKey)

    // const program = new Program(idl, programID, provider);
    // const mappingAccount = new PublicKey(inputPythMapping);
    // await program.rpc.showPythMapping({accounts: { pythAccount: mappingAccount },});
  }

  function confirmAssetSelection() {
    console.log("These are the selected assets: \n", inputAssetName);
  }

  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App">
        <div>
          {
            <div>
              <h1>#1 Let's get some Pyth data shown on Solana</h1>
              <h2>Copy the public key of price account from here:</h2>
              <a href="https://pyth.network/developers/accounts/?cluster=devnet#" target="_blank" rel="noreferrer">Pyth Network - Accounts on Devnet</a>
            </div>
          }

          {
            <div>
              <h2>Paste it here and hit the button</h2>
              <input
                placeholder="Add public key of pyth price account"
                onChange={e => setInputPyth(e.target.value)}
                value={inputPyth}
              />
              <button onClick={showPythPrice}>Fetch Pyth price</button>
            </div>
          }

          {
            <div>
              <h2>See the result on the Solana Explorer</h2>
              <p>Open the <a href="https://explorer.solana.com/address/CxqWzWVdHG9YffvaRUaMnbbeyb7XoHNtxzLNaUpkoyyx?cluster=devnet" target="_blank" rel="noreferrer">program account</a> and refresh a couple of times the "Transaction History".</p>
              <p>After around 30 sec you will se a new entry. Open the new entry and scroll down to the "Program Logs".</p>
              <p>There you will find something similar to this:</p>
              <img src={screenshot} alt="Screenshot of program log on Solana Devnet"/>
            </div>
          }

          {
            <div>
              <h1>#2 Let's use multiple Pyth accounts to do some fun stuff</h1>
              <h2>Initialize the storage account owned by the program</h2>
              {
                <button onClick={initializeStorageAccount}>Initialize</button>
              }

              <h2>Add Pyth symbols to the storage</h2>
              <input
                placeholder="Add new Pyth symbol"
                onChange={e => setInput(e.target.value)}
                value={input}
              />
              <button onClick={addPythSymbol}>Add symbol</button>

              {/* {
                dataList.map((d, i) => <h4 key={i}>{d}</h4>)
              } */}

            </div>
          }

          {
            <div>
              <h2>Paste here the Pyth mapping account public key</h2>
              <input
                placeholder="Add public key of pyth mapping account"
                onChange={e => setInputPythMapping(e.target.value)}
                value={inputPythMapping}
              />
              <button onClick={showPythMapping}>Fetch Pyth mapping account</button>
            </div>
          }

          {       
            <div>
              <h1>#3 Fetch the mapping account</h1>
              {
                <button onClick={getPythMappingAccount}>Fetch Mapping Account</button>
              }

            </div>
          }
          
          {
            <div>
              <h1>#4 Select the assets you want</h1>
              {
                <div style={{ display: 'flex', justifyContent: 'center'}}> 
                  <Autocomplete
                    multiple
                    options={pythAssets}
                    getOptionLabel={(option) => option.symbol}
                    onChange={(event, value) => {
                      setInputAssetName(value)
                    }}
                    sx={{ width: 300 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        label="Assets"
                      />
                    )}
                  />
                </div>
              }
              {
                <div>
                  {
                    <button onClick={confirmAssetSelection}>Confirm asset selection</button>
                  }
                </div>
              }
            </div>
          }

        </div>
      </div>
    );
  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="http://127.0.0.1:8899">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider; 


// Pyth assets
const pythAssets = [
  { symbol: 'Crypto.LUNA/USD', productPubKey: '25tCF4ChvZyNP67xwLuYoAKuoAcSV13xrmP9YTwSPnZY' },
  { symbol: 'FX.USD/CHF', productPubKey: '2UE6gC5FuVPWuKqZamRfcEc5MjtvpRoW6L1anCGW4skS' },
  { symbol: 'Crypto.ETH/USD', productPubKey: '2ciUuGZiee5macAMeQ7bHGTJtwcYTgnt6jdmQnnKZrfu' },
  { symbol: 'Crypto.BNB/USD', productPubKey: '2weC6fjXrfaCLQpqEzdgBHpz6yVNvmSN133m7LDuZaDb' },
  { symbol: 'Crypto.ADA/USD', productPubKey: '31HTfSgBs7PJmY6YgRKaA3ionPmBHrzPnbwZSqRGs2Zx' },
  { symbol: 'Crypto.RAY/USD', productPubKey: '3BtxtRxitVDcsd7pPUWUnFm9KvmNDy9usS4gE6pUFhpH' },
  { symbol: 'FX.GBP/USD', productPubKey: '3K2hkXeoxNeRgjGTU6unJ4WSRaZ3FZxhABTgk8wcbPpX' },
  { symbol: 'Crypto.SOL/USD', productPubKey: '3Mnn2fX6rQyUsyELYms1sBJyChWofzSNRoqYzvgMVz5E' },
  { symbol: 'Crypto.BTC/USD', productPubKey: '3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk' },
  { symbol: 'Crypto.DOT/USD', productPubKey: '4Yprdh5xpNgpsuDTPmfxn1ky7YjXmioZ4h8vGdCaBDsE' }
];