import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Connection, PublicKey, Cluster, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import { Audio } from 'react-loader-spinner';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import './PythTypes.ts';

import idl from "./idl.json";
import kp from "./keypair.json";
import { PythConnection } from './PythConnection'
import { getPythProgramKeyForCluster } from './cluster'
import indexaroLogo from "./assets/indexaro_logo_v3_nobackground.png"
import "./App.css";

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// retreiving permanent app keypair
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Select network.
const SOLANA_CLUSTER_NAME: Cluster = "devnet"

// Set our network.
const network = clusterApiUrl(SOLANA_CLUSTER_NAME);

// Create cron job to update index fund price
var CronJob = require('cron').CronJob;

// Configure Pyth Network access
const connection = new Connection(network)
const pythPublicKey = getPythProgramKeyForCluster(SOLANA_CLUSTER_NAME)
const pythConnection = new PythConnection(connection, pythPublicKey);

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed",
};

// Graph update global var
// TODO: do not use global variables. 
var priceIterations = 0;
var pythPriceArray = [];

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

const App = () => {
  const [inputAssetName, setInputAssetName] = useState('');
  const [indexName, setIndexName] = useState('');
  const [indexNameToDelete, setIndexNameToDelete] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);
  const [indexList, setIndexList] = useState([]);
  const [readBackIndices, setReadBackIndices] = useState([]);
  const [dataLoadingStatus, setDataLoadingStatus] = useState(0);
  const [avgPriceChartData, setAvgPriceChartData] = useState([{price: null, timestamp: null}]);

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletConnected();
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching INDEX list...");
      // Get index list from Solana, then set to state
      getIndexList();
    }
  }, [walletAddress]);

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const getIndexList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.indexStorageAccount.fetch(
        baseAccount.publicKey
      );
      console.log("Storage account: ", baseAccount.publicKey.toString());
      console.log("Got the account: ", account);
      console.log("Current account size in bytes: ", roughSizeOfObject(account));
      setIndexList(account);
    } catch (error) {
      console.log("Error in getIndexList: ", error);
      setIndexList(null);
    }
  };

  const initIndexStorage = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping!");

      await program.rpc.initIndexStorage({
        accounts: {
          storageAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });

      console.log(
        "Created new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await getIndexList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };

  const checkIfWalletConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet detected!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log("Connected wallet:", response.publicKey.toString());

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("No Solana wallet detected - go get yourself a Phantom wallet!");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected wallet:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const nameAndPubkeysIndex = async () => {
    if (indexName.length === 0) {
      console.log("No INDEX link provided!");
      return;
    }
    console.log("INDEX link:", indexName);
    

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      var pubkeys = inputAssetName.map(element => element.productPubKey);

      await program.rpc.nameAndPubkeysIndex(
        indexName, 
        pubkeys, 
        {
        accounts: {
          storageAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("INDEX successfully sent to program!", indexName, pubkeys);
      const storage_account = await program.account.indexStorageAccount.fetch(baseAccount.publicKey);
      console.log('Account : ', storage_account);
      setReadBackIndices(storage_account.indices);
      await getIndexList();
    } catch (error) {
      console.log("Error sending INDEX:", error);
    }
  };

  const deleteIndex = async () => {
    // if (indexName.length === 0) {
    //   console.log("No INDEX link provided!");
    //   return;
    // }
    // console.log("INDEX link:", indexName);
    

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.deleteIndex(
        indexNameToDelete, 
        {
        accounts: {
          storageAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });

      console.log("INDEX to delete successfully sent to program!", indexNameToDelete);
      const storage_account = await program.account.indexStorageAccount.fetch(baseAccount.publicKey);
      console.log('Account : ', storage_account);
      setReadBackIndices(storage_account.indices);
      await getIndexList();
    } catch (error) {
      console.log("Error sending INDEX to delete:", error);
    }
  };

  // Calc a price average
  // TODO: Make use of confidence
  const calcPriceAverage = (priceArray) => {
    var priceSum = 0;
    if (priceArray.length === 0) return 0;
    for(var i = 0; i < priceArray.length; i++) {
      priceSum = priceSum + priceArray[i].price;
    }
    return (priceSum / priceArray.length);
  };

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

  const getPriceUpdates = async () => {
    var matchedPriceUpdateIterations = 2 * readBackIndices[0].pubKeys.length;
    var priceIterationsKept = 2 * matchedPriceUpdateIterations;
    
    var jobEvery30Sec = new CronJob('*/30 * * * * *', function() {
      pythConnection.onPriceChange((product, price) => {
        if (price.price && price.confidence) {
          readBackIndices[0].pubKeys.find(element => {
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

    jobEvery30Sec.start();
    setDataLoadingStatus(1);
  }

  // Helper function 
  function roughSizeOfObject( object ) {

    var objectList = [];
    var stack = [ object ];
    var bytes = 0;

    while ( stack.length ) {
        var value = stack.pop();

        if ( typeof value === 'boolean' ) {
            bytes += 4;
        }
        else if ( typeof value === 'string' ) {
            bytes += value.length * 2;
        }
        else if ( typeof value === 'number' ) {
            bytes += 8;
        }
        else if
        (
            typeof value === 'object'
            && objectList.indexOf( value ) === -1
        )
        {
            objectList.push( value );

            for( var i in value ) {
                stack.push( value[ i ] );
            }
        }
    }
    return bytes;
}

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if (indexList == null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-index-button"
            onClick={initIndexStorage}
          >
            Do One-Time Initialization For Storage Program Account
          </button>
        </div>
      );
    } else {
      return (
        <div>
          {/* <form
            onSubmit={(event) => {
              event.preventDefault();
              sendIndex();
            }}
          >
            <input
              type="text"
              placeholder="Enter INDEX link here"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-index-button">
              Submit
            </button>
          </form> */}
          <div style={{display: 'flex', justifyContent: 'center'}}> 
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
          <div>
            <input
              placeholder="Give your index a name"
              onChange={e => setIndexName(e.target.value)}
              value={indexName}
            />
            <button onClick={nameAndPubkeysIndex}>Save</button>
          </div>
          <h2>Delete Index</h2>
          <div>
          <input
              placeholder="Name of the index to be deleted"
              onChange={e => setIndexNameToDelete(e.target.value)}
              value={indexNameToDelete}
            />
            <button onClick={deleteIndex}>Save</button>
          </div>
          <h2>Start the price update</h2>
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
          <div className="index-grid">
            
          </div>
        </div>
      );
    }
  };

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <img alt="Indexaro Logo" className="indexaro-logo" src={indexaroLogo} />
          <p className="sub-text">✨ Create your own cryptoindex fund. ✨</p>
          {/* Render Connect Wallet btn here if no wallet connected */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* Render INDEXs if wallet connected */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          {/* <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a> */}
        </div>
      </div>
    </div>
  );
};

export default App;
