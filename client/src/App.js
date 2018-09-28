import React, { Component } from "react";
import Home from './Home';
import Game from './Game';
import GameRound from './GameRound';
import { Link, Switch, Route, Redirect } from 'react-router-dom';
import getWeb3 from "./utils/getWeb3";

import Deployments from "./sdk/deployments.json"
import AIWarPlatformContract from "./contracts/AIWarPlatform.json";
import OpenEtherbetGameEventContract from "./contracts/OpenEtherbetGameEvent.json";
import truffleContract from "truffle-contract";

import "./App.css";

class App extends Component {
    state = {
        web3: null,
        accounts: null,
        platform: null,
        gameEvent: null,
        gameCredit: 0,
    };

    constructor(props) {
        super(props);
        this.depositEther = this.depositEther.bind(this);
        this.refreshDepositAmount = this.refreshDepositAmount.bind(this);
    }

    async componentDidMount() {
        try {
            // Get network provider and web3 instance.
            const web3 = await getWeb3();
            const networkId = await web3.eth.net.getId();
            const deployments = Deployments.networks[networkId];
            if (!deployments) throw new Error(`Contracts not deployed to the network ${networkId}`);
            console.log(`Deployed contracts:`, JSON.stringify(deployments));

            // Use web3 to get the user's accounts.
            const accounts = await web3.eth.getAccounts();

            const AIWarPlatform = truffleContract(AIWarPlatformContract);
            AIWarPlatform.setProvider(web3.currentProvider);
            const platform = await AIWarPlatform.at(deployments.AIWarPlatform.deployedAddress);

            const OpenEtherbetGameEvent = truffleContract(OpenEtherbetGameEventContract);
            OpenEtherbetGameEvent.setProvider(web3.currentProvider);
            const gameEvent = await OpenEtherbetGameEvent.at(deployments.OpenEtherbetGameEvent.deployedAddress);

            const gameCredit = web3.utils.fromWei(await gameEvent.getDepositAmount.call(accounts[0]), 'ether');
            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({ web3, accounts, platform, gameEvent, gameCredit });
        } catch (error) {
            console.error(error);
        }
    }

    async depositEther(e) {
        e.preventDefault();
        const state = this.state;
        const web3 = state.web3;
        await state.gameEvent.deposit({
            from: state.accounts[0],
            value: web3.utils.toWei("1", "ether")
        });
    }

    async refreshDepositAmount(e) {
        e.preventDefault();
        const state = this.state;
        const web3 = state.web3;
        const gameCredit = web3.utils.fromWei(await state.gameEvent.getDepositAmount.call(state.accounts[0]), 'ether');
        this.setState({ gameCredit });
    }

    render() {
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <Route>
                <div>
                    <div className="container">
                        <nav className="navbar navbar-default navbar-expand-lg navbar-light bg-light">
                            <span className="navbar-brand">AIWar</span>
                            <ul className="navbar-nav mr-auto">
                                <li className="nav-item">
                                    <Link className="nav-link" to="/">Home</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/about">About</Link>
                                </li>
                            </ul>
                            <div className="form-inline">
                                <span className="form-control navbar-text">Credit: { this.state.gameCredit } ETH</span>
                                <button className="btn btn-default" onClick={ this.refreshDepositAmount }>
                                    <span className="fas fa-sync" aria-hidden="true"></span>
                                </button>
                                <button className="btn btn-outline-success" onClick={ this.depositEther }>
                                    Deposit
                                </button>
                            </div>
                        </nav>
                    </div>
                    <div className="container">
                        <Switch>
                            <Route exact path="/" render={(props) => <Home {...props} appState={this.state}/>}/>
                            <Route path="/g/:gameAddress" render={(props) => <Game {...props} appState={this.state}/>}/>
                            <Route path="/r/:gameRoundAddress" render={(props) => <GameRound {...props} appState={this.state}/>}/>
                            <Redirect from="/" to="/" />
                        </Switch>
                    </div>
                </div>
            </Route>
        );
    }
}

export default App;
