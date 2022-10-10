import React, {useState, useEffect, useRef} from "react";
import { ethers } from "ethers";
import './App.css';
import {abi as contractABI} from "./utils/contract.json";
import toast, {Toaster} from "react-hot-toast";

const findMetamaskAccount = async () => {
  try {
    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error("Make sure you have Metamask !");
      return null;
    }
    
    const accounts = await ethereum.request({method:"eth_accounts"});
    if (accounts.length == 0) {
      toast.error("No authorized accounts !");
      return null;
    }
    
    return accounts[0];
    
  } catch (error) {
    toast.error("Something went wrong ! Please try again !");
    return null;
  }
}


const callContract = async () => {
    const contractAddress = "0xd794550e4b39e74917c4C4509AB4E7140A774570";
    const {ethereum} = window;
    if(ethereum){
      // to connect with the contract we need 3 things
      // Signer: is the person making the transaction basically the current user of the app
      // Contract Address: is the address we get when we deploy the contract
      // ABI: a configuration JSON object usually generated when a contract is deployed
      // WARNING: every time we deploy our contract we need to update the address and the ABI file
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      return contract;
    }
    else return null;
}


export default function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const currentWinner = useRef(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  
  
  // check if we have an authorized account and set it to the current account
  useEffect(async ()=>{
    const account = await findMetamaskAccount();
    await getAllMessages();
    if(account){
      setCurrentAccount(account);
    }
  }, []);

  // listen to events emitted by the contract
  // Event: new message was sent
  useEffect(async ()=>{
    const onNewMessage = (from, timestamp, message)=>{
      setAllMessages(prevState => [
        ...prevState, 
        {
        address:from,
        timestamp: new Date(timestamp*1000),
        message,
        }
      ]);
    };

    const contract = await callContract();
    contract.on("NewMessage", onNewMessage);

    return ()=>{
      if(contract){
        contract.off("NewMessage", onNewMessage);       
      }
    }
  }, []);

  // listen to events emitted by the contract
  // Event: new user got the prize
  useEffect(async ()=>{
    
    const onNewPrize = (winner, timestamp, amount)=>{
      if(timestamp.toNumber() !== currentWinner?.current?.timestamp){
        toast(currentAccount?.toString()?.toLowerCase() === winner?.toString()?.toLowerCase() ? "That was so damn hilarious ! You deserve the prize :)" : `${winner} just won a prize for his hilarious meme !`, {
          icon:'🎉',
        }); 
        currentWinner.current = {address:winner, timestamp: timestamp.toNumber(), amount};
      }
      
    };

    const contract = await callContract();
    contract.on("NewPrize", onNewPrize);

    return ()=>{
      if(contract){
        contract.off("NewPrize", onNewPrize);       
      }
    }
  }, []);

  const getAllMessages = async ()=>{
    try {
      const contract = await callContract();
      if(contract){
        const waves = await contract.getAllMessages();
        const messages = waves.map(({from, timestamp, message})=>{
          return {
            address: from, 
            timestamp: new Date(timestamp * 1000),
            message,
          }});
        
        setAllMessages(messages);
      }
      else toast.error("Make sure you have Metamask is installed !");
    } catch (error) {
      toast.error("Something went wrong ! Please try again !");
    }
  }

  const connectWallet = async () => {
  try {
    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error("Make sure you have Metamask is installed !");
      return;
    }

    const accounts = await ethereum.request({method:"eth_requestAccounts"});
    setCurrentAccount(accounts[0]);
    toast.success(`Connected to account ${accounts[0]}`);
  } catch (error) {
    toast.error("Couldn't connect to wallet ! Please try again !");
  }
}

  const wave = async () => {
    try {
        setLoadingMessage("Connecting to contract...")
        const contract = await callContract();
        if(contract && currentMessage){
          const txn = await contract.sendMessage(currentMessage, {gasLimit:300000});
          setLoadingMessage("Transaction mining...");
          await txn.wait();
          setLoadingMessage("");
          setCurrentMessage("");
          
      }
      else {
        toast.error("Message was not sent !");
      }
    } catch (error) {
      toast.error("Transaction failed :( Please try again !");
      setLoadingMessage("");
      setCurrentMessage("");
    }
    
  }
  
  return (
    <div className="mainContainer">

      <div className="dataContainer">
        <div className="header">
        👋 Hey there!
        </div>

        <div className="bio">
        I am <a href="https://younesaeo.github.io/portfolio/">Younes</a>  . I love startups 🚀 and building stuff 👷. This is my first web3 app ever. You must be proud because you're making history 💪. Connect your Ethereum wallet 🤑. Say hi, send me a meme or a dad joke and you might get a little prize if you made my day :)
        </div>
        <input
            type="text"
            name="message"
            placeholder="joke or meme"
            onChange={(e)=>{
              setCurrentMessage(e.target.value);
            }}
            value={currentMessage}
            required
          />
        <button className="waveButton" onClick={wave} disabled={!currentAccount || !currentMessage || loadingMessage}>
          {loadingMessage || "Say Hi"} 
        </button>
        {
          !currentAccount && (<button className="waveButton" onClick={connectWallet}>
          Connect Wallet
        </button>)
        }
        {allMessages.map(({address, timestamp, message}, index)=>{
      return (<div key={index} style={{ backgroundColor: "OldLace", marginTop: "16px", padding: "8px" }}>
              <div>Address: {address}</div>
              <div>Time: {timestamp.toString()}</div>
              <div>Message: {message}</div>
            </div>);
        })}
        <Toaster toastOptions={{style:{maxWidth:"500px"}}}/>
      </div>
    </div>
  );
}
