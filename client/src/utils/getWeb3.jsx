import Web3 from "web3";
import Deployments from "../core/sdk/deployments.js"

const getWeb3 = (currentWeb3, helper) =>
  new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
     if (!helper) { //first execution. Cheeck if Metamask
      if( typeof window.web3 !== "undefined" ){
        const web3 = new Web3(window.web3.currentProvider);
        checkMetamask(web3);
      }
      else {
        setInfura( 'Infura');
      }
    }
    else if (helper !== 'Infura' ){
      checkMetamask(currentWeb3, helper);
    }
    async function checkMetamask( currentWeb3, helper ) {
      // Checking if Web3 has been injected by the browser (Mist/MetaMask).
        let web3;
        if(helper === 'network') {
          web3 = new Web3(window.web3.currentProvider) || currentWeb3;
        }
        else{
          web3 = currentWeb3;
        }
        const networkId = await web3.eth.net.getId();
        const accounts = await web3.eth.getAccounts(); //just to check if metamask is unlocked
        const deployments = Deployments.networks[networkId]; //check if we have contracts on the deployed network
        if(deployments && (accounts.length>0)){
          helper = "MetaMask";
        }
        else if(!deployments){
          setInfura('network');
        }
        else {
          helper = 'locked';
        }
        resolve({web3, deployments, helper });
      }

    function setInfura( helper ){
      // Fallback to localhost if no web3 injection. We've configured this to
      // use the development console's port by default.

      /*const localhost = new Web3.providers.HttpProvider(
          "http://127.0.0.1:9545"
      );*/
      const infura = new Web3.providers.HttpProvider(
        "https://ropsten.infura.io/v3/f0751f2b1a454d22bd126ac0b9b2cb53"
      );
      const web3 = new Web3(infura);
      const deployments = Deployments.networks[3]; //get info from Ropsten network
      resolve({web3, deployments, helper });
    }
  });

export default getWeb3;
