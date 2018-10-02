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
        newDeposit: ""
    };

    constructor(props) {
        super(props);
        this.depositEther = this.depositEther.bind(this);
        this.refreshDepositAmount = this.refreshDepositAmount.bind(this);
        this.handleNewDeposit = this.handleNewDeposit.bind(this);
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

            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({ web3, accounts, platform, gameEvent });
            this.refreshDepositAmount();
        } catch (error) {
            console.error(error);
        }
    }
    handleNewDeposit(e){
      const val = e.target.value;
      if (/^(\d+(\.\d{1,18})?)|^(?![\s\S])$/.test(val)) {
        this.setState({
          newDeposit: val
        });
      }
    }
    async depositEther(e) {
        e.preventDefault();
        const state = this.state;
        const web3 = state.web3;
        await state.gameEvent.deposit({
            from: state.accounts[0],
            value: web3.utils.toWei(state.newDeposit, "ether")
        });
    }

    async refreshDepositAmount(e) {
        if (e) e.preventDefault();
        const state = this.state;
        const web3 = state.web3;
        const gameCreditInWei = await state.gameEvent.getDepositAmount.call(state.accounts[0]);
        const gameCredit = web3.utils.fromWei(gameCreditInWei.toString(), 'ether');
        this.setState({ gameCredit });
    }

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
                    <div className="container fixed-bottom wallet">
                        <footer>
                          <div className="navbar navbar-inverse navbar-fixed-bottom p-1 py-2">
                              <div className="container p-0">
                                  {/* this is the icons (dots, home, info) at the top of the opened menu */}
                                  <div className="w-100 row p-0 m-0">
                                    <div className="col-7 text-right">
                                      <i className="navbar-toggle fas fa-ellipsis-h d-inline d-sm-none"  data-toggle="collapse" data-target=".footer-body"></i>
                                    </div>
                                    <div className="col-5 p-0 m-0 collapse text-right footer-body">
                                      <Link to="/" className="d-inline">
                                        <i className="fas fa-home mr-2"></i>
                                      </Link>
                                      <Link className=" " to="/about"  className="d-inline">
                                        <i className="fas fa-info-circle"></i>
                                      </Link>
                                    </div>
                                  </div>
                                  {/* this is the whole wallet part */}
                                  <div className="navbar-collapse collapse footer-body">
                                      <div className="row">
                                          <div className="col-12 col-md-6 order-1 m-0  p-2">
                                            <select className="col-7 m-0 p-0">
                                              <option>Ropsten Testnet</option>
                                            </select>
                                            <button className="btn btn-default col-5 m-0 px-2 py-1" onClick={ this.refreshDepositAmount } ><i class="fas fa-sync-alt"></i>  Refresh </button>
                                          </div>
                                          <div className="col-12 col-sm-6 order-2 order-md-3 mt-2 section">
                                            <h5>Wallet Balance</h5>
                                            <h6>ETH { this.state.gameCredit } </h6>
                                            <h6>USD xxxxxx</h6>
                                            <form className="form-group form-row" onSubmit={this.depositEther }>
                                              <input type="text" placeholder="Amount" className="col-7 m-0 p-2 " value={this.state.newDeposit} onChange={this.handleNewDeposit} />
                                              <button type="submit" value="Deposit" className="col-5 m-0 p-0 btn btn-default">Deposit!</button>
                                            </form>
                                          </div>
                                          <div className="col-12 col-sm-6 order-3 order-md-4 mt-2 section">
                                            <h5>Deposited Credit</h5>
                                            <h6>ETH { this.state.gameCredit } </h6>
                                            <h6>USD xxxxxx</h6>
                                            <form className="form-group form-row" onSubmit={this.depositEther }>
                                              <input type="text" placeholder="Amount" className="col-7 m-0 p-2" value={this.state.newDeposit} onChange={this.handleNewDeposit} />
                                              <button type="submit" value="Withdraw" className="col-5 m-0 p-0 btn btn-default">Withdraw!</button>
                                            </form>
                                          </div>
                                          <div className="col-12 col-sm-6 order-4 order-md-2 mt-2 section">
                                            <h5>Locked Credit</h5>
                                            <h6>ETH { this.state.gameCredit } </h6>
                                            <h6>USD xxxxxx</h6>
                                          </div>
                                      </div>
                                  </div>
                                  {/*this is the part that is always visible */}
                                  <div className="navbar-header w-100 p-0">
                                      <div className="row p-2">
                                          <div className="col-10 m-0 p-0 text-left align-middle">
                                            <span className="h4">ETH Wallet</span>
                                          </div>
                                          <div
                                            className="navbar-toggle col-2 m-0 p-0 text-right "
                                            data-toggle="collapse"
                                            data-target=".footer-body"
                                            >
                                            <Link to="#" >
                                              <i className="d-inline fa-2x fas myChevron"></i></Link>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </footer>
                    </div>
                </div>
            </Route>
        );
    }
}

export default App;
