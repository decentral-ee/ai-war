import React, { Component } from "react";
import Home from './Home';
import Game from './Game';
import GameRound from './GameRound';
import { Switch, Route, Redirect } from 'react-router-dom';
import getWeb3 from "./utils/getWeb3";
import Wallet from "./components/wallet"

import Deployments from "./sdk/deployments.json"
import AIWarPlatformContract from "./contracts/AIWarPlatform.json";
import OpenEtherbetGameEventContract from "./contracts/OpenEtherbetGameEvent.json";
import truffleContract from "truffle-contract";

import "./App.css";

class App extends Component {
    state = {
        web3: null,
        platform: null,
        gameEvent: null
    };

    async componentDidMount() {
        try {
            // Get network provider and web3 instance.
            const web3 = await getWeb3();
            const networkId = await web3.eth.net.getId();
            const deployments = Deployments.networks[networkId];
            if (!deployments) throw new Error(`Contracts not deployed to the network ${networkId}`);
            console.log(`Deployed contracts:`, JSON.stringify(deployments));

            const AIWarPlatform = truffleContract(AIWarPlatformContract);
            AIWarPlatform.setProvider(web3.currentProvider);
            const platform = await AIWarPlatform.at(deployments.AIWarPlatform.deployedAddress);

            const OpenEtherbetGameEvent = truffleContract(OpenEtherbetGameEventContract);
            OpenEtherbetGameEvent.setProvider(web3.currentProvider);
            const gameEvent = await OpenEtherbetGameEvent.at(deployments.OpenEtherbetGameEvent.deployedAddress);
            //get ETH value exchange rate from CMC API
            this.setState({ web3, platform, gameEvent});
        } catch (error) {
            console.error(error);
        }
    }

    //
    //
    //took out "refreshWallet"

    render() {
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <Route>
                <div>
                    <div className="Logo text-center p-4 mb-2 h-18"><img src="logo.png" alt="AiWar.io logo"/></div>
                    <div className="container">
                        <Switch>
                            <Route exact path="/" render={(props) => <Home {...props} appState={this.state}/>}/>
                            <Route path="/g/:gameAddress" render={(props) => <Game {...props} appState={this.state}/>}/>
                            <Route path="/r/:gameRoundAddress" render={(props) => <GameRound {...props} appState={this.state}/>}/>
                            <Redirect from="/" to="/" />
                        </Switch>
                    </div>
                    {/* removed wallet hmtl
                      ideally wallet should take {children}, with the different sections. This way I can pass it the gamestate*/}
                    <Wallet web3={this.state.web3} gameEvent={this.state.gameEvent}/>
                </div>
            </Route>
        );
    }
}

export default App;
