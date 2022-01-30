import './App.css';
import { useState, React } from 'react';
import { Connection, PublicKey, clusterApiUrl, Cluster } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import './PythTypes.ts';
import { PythConnection } from './PythConnection'
import { getPythProgramKeyForCluster } from './cluster'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Audio } from 'react-loader-spinner';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
require('@solana/wallet-adapter-react-ui/styles.css');

const wallets = [ getPhantomWallet() ]

const { SystemProgram, Keypair } = web3;
const storageAccountIndex = Keypair.generate();

const opts = {
  preflightCommitment: "processed"
}
const programIDString = "CxqWzWVdHG9YffvaRUaMnbbeyb7XoHNtxzLNaUpkoyyx";
const programID = new PublicKey(programIDString);

const SOLANA_CLUSTER_NAME: Cluster = 'devnet'
const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER_NAME))
const pythPublicKey = getPythProgramKeyForCluster(SOLANA_CLUSTER_NAME)

const pythConnection = new PythConnection(connection, pythPublicKey)

var CronJob = require('cron').CronJob;

var priceIterations = 0;
var pythPriceArray = [];

function App() {
  const [inputAssetName, setInputAssetName] = useState('');
  const [indexName, setIndexName] = useState('');
  const [readBackIndexName, setReadBackIndexName] = useState('');
  const [readBackPubKeys, setReadBackPubKeys] = useState([]);
  const [avgPriceChartData, setAvgPriceChartData] = useState([{price: null, timestamp: null}]);
  const [dataLoadingStatus, setDataLoadingStatus] = useState('');
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

  function confirmAssetSelection() {
    console.log("These are the selected assets: \n", inputAssetName.map(element => element.productPubKey));
  }

  async function initIndexStorage() {   
    const provider = await getProvider();
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    try {
      /* interact with the program via rpc */
      await program.rpc.initIndexStorage({
        accounts: {
          storageAccount: storageAccountIndex.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [storageAccountIndex]
      });
    } catch (err) {
        console.log("Transaction error: ", err);
      }
  }

  async function nameAndPubkeysIndex(){
    if(!indexName) return
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);
    var pubkeys = inputAssetName.map(element => element.productPubKey);
    await program.rpc.nameAndPubkeysIndex(
      indexName,
      pubkeys,
      {accounts: {
        storageAccount: storageAccountIndex.publicKey,
      },
    });

    const storage_account = await program.account.indexStorageAccount.fetch(storageAccountIndex.publicKey);
    console.log('account: ', storage_account);
    setReadBackIndexName(storage_account.indexName);
    setReadBackPubKeys(storage_account.pubKeys);
  }

  function getPriceUpdates(){
    jobEvery30Sec.start();
    setDataLoadingStatus(1);
  }

  const LoadingIndicator = props => {
    if(dataLoadingStatus === 0) {
      return(null)
    }
    else if(dataLoadingStatus === 1) {
      return(
        <div>
          <h3>Loading ...</h3>
          {
            <div
            style={{
              width: "100%",
              height: "100",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
            >
              <Audio type="ThreeDots" color="#6633cc" height="100" width="100" />
            </div>
          }
        </div>
      )
    }
    else {
      return(
        <h3>There it is! You will get a price update every 30 seconds.</h3>
      )
    }
  }

  var matchedPriceUpdateIterations = 2 * readBackPubKeys.length;
  var priceIterationsKept = 2 * matchedPriceUpdateIterations;

  // Calc a simple price average
  // ToDo: Make use of confidence
  function calcPriceAverage(priceArray) {
    var priceSum = 0;
    for(var i = 0; i < priceArray.length; i++) {
      priceSum = priceSum + priceArray[i].price;
    }
    return (priceSum / priceArray.length);
  }

  var jobEvery30Sec = new CronJob('*/30 * * * * *', function() {
    pythConnection.onPriceChange((product, price) => {
      if (price.price && price.confidence) {
        readBackPubKeys.find(element => {
          if (element.includes(price.productAccountKey.toString())) {
            priceIterations++;
            pythPriceArray.push(price);
            if( priceIterations === matchedPriceUpdateIterations ) {
              // ToDo: Check if every product has been updated
              pythConnection.stop();
              priceIterations = 0;
              setDataLoadingStatus(2);
              setAvgPriceChartData(avgPriceChartData => [...avgPriceChartData, {price: Number(calcPriceAverage(pythPriceArray).toFixed(2)), timestamp: new Date()}])
              // Keep array at fixed size
              if( pythPriceArray.length > priceIterationsKept ) {
                pythPriceArray.splice(0, matchedPriceUpdateIterations);
              }
              return true;
            }
            return true;
          }
        return (null)
      })
    
      } else {
        console.log(`${product.symbol}: price currently unavailable`)
      }
    })

    pythConnection.start();

  }, null, false, 'America/Los_Angeles');

  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {
    return (
      <div className="App">
          <h1>Create your own index fund</h1>
          <h2>Initialize the program and create some storage space on the Solana blockchain</h2>
          {
            <button onClick={initIndexStorage}>Initialize</button>
          }
          <h2>Select your assets</h2>
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
          <h2>Give your index a name and save your asset selection on the Solana blockchain</h2>
          <div>
            <input
              placeholder="Give your index a name"
              onChange={e => setIndexName(e.target.value)}
              value={indexName}
            />
            <button onClick={nameAndPubkeysIndex}>Save</button>
          </div>
          <h2>Start the price update</h2>
          {
            <div>
              {
                <button onClick={getPriceUpdates}>Update prices</button>
              }
              {
                <div>
                  <LoadingIndicator/>
                </div>
              }
            </div>
          }
          <h2>Have a look at the price development of your fund</h2>
          {
            <div style={{ display: 'flex', justifyContent: 'center'}}>
              <LineChart
                width={500}
                height={300}
                data={avgPriceChartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line name="USD" type="monotone" dataKey="price" stroke="#6633cc" activeDot={{ r: 8 }} />
              </LineChart>
            </div>
          }
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
  { symbol: 'Crypto.ETH/USD', productPubKey: '2ciUuGZiee5macAMeQ7bHGTJtwcYTgnt6jdmQnnKZrfu' },
  { symbol: 'Crypto.BNB/USD', productPubKey: '2weC6fjXrfaCLQpqEzdgBHpz6yVNvmSN133m7LDuZaDb' },
  { symbol: 'Crypto.ADA/USD', productPubKey: '31HTfSgBs7PJmY6YgRKaA3ionPmBHrzPnbwZSqRGs2Zx' },
  { symbol: 'Crypto.RAY/USD', productPubKey: '3BtxtRxitVDcsd7pPUWUnFm9KvmNDy9usS4gE6pUFhpH' },
  { symbol: 'FX.GBP/USD', productPubKey: '3K2hkXeoxNeRgjGTU6unJ4WSRaZ3FZxhABTgk8wcbPpX' },
  { symbol: 'Crypto.SOL/USD', productPubKey: '3Mnn2fX6rQyUsyELYms1sBJyChWofzSNRoqYzvgMVz5E' },
  { symbol: 'Crypto.BTC/USD', productPubKey: '3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk' },
  { symbol: 'Crypto.DOT/USD', productPubKey: '4Yprdh5xpNgpsuDTPmfxn1ky7YjXmioZ4h8vGdCaBDsE' },
  { symbol: 'Equity.US.NFLX/USD', productPubKey: '4nyATHv6KnZY5fVTqQLq9DkcstfqGYd834Jmbch2bf3i' },
  { symbol: 'Crypto.DOGE/USD', productPubKey: '4zvUzWGBxZA9nTgBZWAf1oGYw6nCEYRscdt14umTNWhM' },
  { symbol: 'Crypto.FIDA/USD', productPubKey: '5kWV4bhHeZANzg5MWaYCQYEEKHjur5uz1mu5vuLHwiLB' },
  { symbol: 'Crypto.FTT/USD', productPubKey: '63VWd2FVbukVozZ1okHt8wVMq7enAYFXYnmp2DUQtBBJ' },
  { symbol: 'Crypto.HXRO/USD', productPubKey: '6C4PJ4bMuLFmvHRqSkmGeyoSGAKMfPG1um1k1suryfs' },
  { symbol: 'Crypto.SRM/USD', productPubKey: '6MEwdxe4g1NeAF9u6KDG14anJpFsVEa2cvr5H6iriFZ8' },
  { symbol: 'Metal.XAU/USD', productPubKey: '6NF21VSjK5qt5t6JZXZtMZ1kXEwTuDBqSYL2ev7dMgx3' },
  { symbol: 'Crypto.USDC/USD', productPubKey: '6NpdXrQEpmDZ3jZKmM2rhdmkd3H6QAk23j2x8bkXcHKA' },
  { symbol: 'Equity.US.AMC/USD', productPubKey: '6U4PrvMwfMcBkG7Zrc4oxYqJwrfTMWmgA9hS6fjDJkmo' },
  { symbol: 'Crypto.PORT/USD', productPubKey: '71k9hopyryKPUWug1iKiJCkbEsz1C7EptMN2t1dtgNmA' },
  { symbol: 'Crypto.ATOM/USD', productPubKey: '76B8fdtbYnpba2io43rt7MpAQHCe2objsc637f8auC3G' },
  { symbol: 'Equity.US.GME/USD', productPubKey: '7MudLeJnT2GCPZ66oeAqd6jenF9fGARrB1pLo5nBT3KM' },
  { symbol: 'Crypto.BCH/USD', productPubKey: '89GseEmvNkzAMMEXcW9oTYzqRPXTsJ3BmNerXmgA1osV' },
  { symbol: 'Crypto.COPE/USD', productPubKey: '8g9qN2XBoTr53dcescpHjQUkhKL6pHrcHzHQ9MWpkLJa' },
  { symbol: 'Equity.US.GE/USD', productPubKey: '8zDnpUALoDEZoufcVPjTZSpLXpWVZJbRQGEXVMBy14SW' },
  { symbol: 'Equity.US.GOOG/USD', productPubKey: 'CpPmHbFqkfejPcF8cvxyDogm32Sqo3YGMFBgv3kR1UtG' },
  { symbol: 'Crypto.MNGO/USD', productPubKey: 'EssaQC37YW2LVXTsEVjijNte3FTUw21MJBkZYHDdyakc' },
  { symbol: 'Equity.US.AAPL/USD', productPubKey: 'G89jkM5wFLpmnbvRbeePUumxsJyzoXaRfgBVjyx2CPzQ' },
  { symbol: 'Equity.US.TSLA/USD', productPubKey: 'GaBJpKtnyUbyKe34XuyegR7W98a9PT5cg985G974NY8R' },
  { symbol: 'Equity.US.AMZN/USD', productPubKey: 'J6zuHzycf8XLd85QHDUwMtVPxJGPJptPSC9dyioKXCnb' },
  { symbol: 'FX.EUR/USD', productPubKey: 'EWxGfxoPQSNA2744AYdAKmsQZ8F9o9M7oKkvL3VM1dko' }
  
];