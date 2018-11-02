import React, { Component } from "react";
import Home from './Home';
import Game from './Game';
import GameRound from './GameRound';
import { Link, Switch, Route, Redirect } from 'react-router-dom';
import getWeb3 from "./utils/getWeb3";
import Wallet from "./components/Wallet"
 import Loader from 'react-loader-spinner'
import AIWarPlatformContract from "./core/build/contracts/AIWarPlatform.json";
import OpenEtherbetGameEventContract from "./core/build/contracts/OpenEtherbetGameEvent.json";
import truffleContract from "truffle-contract";
import "./App.css";
class App extends Component {
    state = {
        accounts: [],
        initialized: false,
        helper: null
    };
    web3 = null;
    platform = null;
    gameEvent = null;

    constructor(props) {
      super(props);
      this.refreshNetwork = this.refreshNetwork.bind(this);
    }
    componentDidMount() {  //ok so probably we need to avoid the IIFE, and insted use bind(this) to sort out all the issues...
      // Get network helper and web3 instance.
      this.refreshNetwork();

    }

    async refreshNetwork(e){
      let response = await getWeb3( this.web3, this.state.helper );
      const { web3, deployments, helper} = response; 
      if(this.state.helper !== helper){
        const AIWarPlatform = truffleContract(AIWarPlatformContract);
        AIWarPlatform.setProvider(web3.currentProvider);
        const platform = await AIWarPlatform.at(deployments.AIWarPlatform.deployedAddress);
        const OpenEtherbetGameEvent = truffleContract(OpenEtherbetGameEventContract);
        OpenEtherbetGameEvent.setProvider(web3.currentProvider);
        const gameEvent = await OpenEtherbetGameEvent.at(deployments.OpenEtherbetGameEvent.deployedAddress);
        this.platform = platform;
        this.web3 = web3;
        this.gameEvent = gameEvent;
        this.setState({ initialized: true, deployments, helper});
        if(helper === 'MetaMask'){
          const accounts = await web3.eth.getAccounts();
          this.setState({accounts})
        }
      }
      await new Promise(resolve => setTimeout(resolve,777));
      this.refreshNetwork();
    }

    //
    //
    //took out "refreshWallet"

    render() {
      const { initialized, helper} = this.state;
        if (!initialized) {
            return (
                <div className=" w-100 d-block d-flex" style={{height: '100vh'}}>
                  <div className='m-auto'>
                    <Loader type="Triangle" color="#fff" height={80} width={80} />
                  </div>
                </div>
              );
        }
        return (
            <Route>
                <div>
                    <Link to="/">
                        <div className="Logo text-center p-4 mb-2 h-18"><img src="../logo.png" alt="AiWar.io logo"/></div>
                    </Link>
                    <div className="container">
                        <Switch>
                            <Route exact path="/" render={(props) => <Home {...props} app={this}/>}/>
                            <Route path="/g/:gameAddress" render={(props) => <Game {...props} app={this}/>}/>
                            <Route path="/r/:gameRoundAddress" render={(props) => <GameRound {...props} app={this}/>}/>
                            <Redirect from="/" to="/" />
                        </Switch>
                    </div>
                    <div className="emptyDiv"></div>
                    <Wallet web3={this.web3} gameEvent={this.gameEvent} helper={helper}/>
                </div>
            </Route>
        );
    }
}

export default App;
