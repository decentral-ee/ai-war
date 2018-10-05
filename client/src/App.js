import React, { Component } from "react";
import Home from './Home';
import Game from './Game';
import GameRound from './GameRound';
import { Link, Switch, Route, Redirect } from 'react-router-dom';
import getWeb3 from "./utils/getWeb3";

import Deployments from "./core/sdk/deployments.json"
import AIWarPlatformContract from "./core/build/contracts/AIWarPlatform.json";
import OpenEtherbetGameEventContract from "./core/build/contracts/OpenEtherbetGameEvent.json";
import truffleContract from "truffle-contract";

import "./App.css";

class App extends Component {
    web3 = null;
    platform = null;
    gameEvent = null;

    state = {
        accounts: null,
        gameCredit: 0,
        lockedDeposit:0,
        newDeposit: ""
    };

    constructor(props) {
        super(props);
        this.depositEther = this.depositEther.bind(this);
        this.refreshWallet = this.refreshWallet.bind(this);
        this.handleNewDeposit = this.handleNewDeposit.bind(this);
        this.withdrawEther = this.withdrawEther.bind(this);
    }

    async componentDidMount() {
        try {
            // Get network provider and web3 instance.
            this.web3 = await getWeb3();
            const networkId = await this.web3.eth.net.getId();
            const networkString = await this.web3.eth.net.getNetworkType()
            const deployments = Deployments.networks[networkId];
            if (!deployments) throw new Error(`Contracts not deployed to the network ${networkId}`);
            console.log(`Deployed contracts:`, JSON.stringify(deployments));

            // Use web3 to get the user's accounts.
            const accounts = await this.web3.eth.getAccounts();

            const AIWarPlatform = truffleContract(AIWarPlatformContract);
            AIWarPlatform.setProvider(this.web3.currentProvider);
            this.platform = await AIWarPlatform.at(deployments.AIWarPlatform.deployedAddress);

            const OpenEtherbetGameEvent = truffleContract(OpenEtherbetGameEventContract);
            OpenEtherbetGameEvent.setProvider(this.web3.currentProvider);
            this.gameEvent = await OpenEtherbetGameEvent.at(deployments.OpenEtherbetGameEvent.deployedAddress);
            //get ETH value exchange rate from CMC API
            try {
              const response = await fetch(`https://api.coinmarketcap.com/v1/ticker/ethereum/`);
              if (!response.ok) {
                throw Error(response.statusText);
              }
              const json = await response.json();
              const data = [];
              data['BTC']=json[0].price_btc;
              data['USD']=json[0].price_usd;
              this.setState({ exchange: data });
            } catch (error) {
              console.log(error);
            }
            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({ accounts, networkString });
            this.refreshWallet();
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
        await this.gameEvent.deposit({
            from: state.accounts[0],
            value: this.web3.utils.toWei(state.newDeposit, "ether")
        });
    }
    handleNewWithdraw(e){
      const val = e.target.value;
      if (/^(\d+(\.\d{1,18})?)|^(?![\s\S])$/.test(val)) {
        this.setState({
          newWithdraw: val
        });
      }
    }
    async withdrawEther(e) {
        e.preventDefault();
        const state = this.state;
        console.log("function withdrawAll called");
        await this.gameEvent.withdrawAll({
          from: state.accounts[0],
        });
        /*
        await this.gameEvent.withdrawEther({
            from: state.accounts[0],
            value: web3.utils.toWei(state.newWithdraw, "ether")
        });*/
    }
    async refreshWallet(e) {
        if (e) e.preventDefault();
        const state = this.state;
        const web3 = this.web3;
        const bal = await web3.eth.getBalance(this.state.accounts[0]);
        const balance = web3.utils.fromWei(bal.toString(), 'ether');
        const gameCreditInWei = await this.gameEvent.getDepositAmount.call(state.accounts[0]);
        const gameCredit = web3.utils.fromWei(gameCreditInWei.toString(), 'ether');
        const lockedDepositInWei = await this.gameEvent.getTotalLockedBalance.call(state.accounts[0]);
        const lockedDeposit = web3.utils.fromWei(lockedDepositInWei.toString(), 'ether');
        this.setState({ gameCredit, balance, lockedDeposit });
        console.log("wallet refreshed");
    }

    render() {
        if (!this.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <Route>
                <div>
                    <Link to="/">
                        <div className="Logo text-center p-4 mb-2 h-18"><img src="logo.png" alt="AiWar.io logo"/></div>
                    </Link>
                    <div className="container">
                        <Switch>
                            <Route exact path="/" render={(props) => <Home {...props} app={this}/>}/>
                            <Route path="/g/:gameAddress" render={(props) => <Game {...props} app={this}/>}/>
                            <Route path="/r/:gameRoundAddress" render={(props) => <GameRound {...props} app={this}/>}/>
                            <Redirect from="/" to="/" />
                        </Switch>
                    </div>
                    <div className="container fixed-bottom wallet">
                        <footer>
                          <div className="navbar navbar-inverse navbar-fixed-bottom p-1 py-2">
                              <div className="container p-0">
                                  {/* this is the icons (dots) at the top of the opened menu on mobile only */}
                                  <div className="w-100 row p-0 m-0 d-sm-none">
                                    <div className="col-7 text-right">
                                      <i className="navbar-toggle fas fa-ellipsis-h d-inline"  data-toggle="collapse" data-target=".footer-body"></i>
                                    </div>
                                  </div>
                                  {/* this is the whole wallet part */}
                                  <div className="navbar-collapse collapse footer-body row">
                                      <div className="row col-11">
                                          <div className="col-12 col-md-6 order-1 m-0 p-2">
                                            <select className="m-0 p-0">
                                              <option>{this.state.networkString}</option>
                                            </select>
                                          </div>
                                          <div className="col-12 col-md-6 order-2 order-sm-3 pt-2 section">
                                            <h5>Wallet Balance</h5>
                                            <h6>ETH { this.state.balance } </h6>
                                            <h6>USD { Math.round(this.state.balance * this.state.exchange["USD"]* 100) / 100}</h6>
                                            <form className="form-group form-row" onSubmit={this.depositEther }>
                                              <input type="text" placeholder="Amount" className="col-7 m-0 p-2 " value={this.state.newDeposit} onChange={this.handleNewDeposit} />
                                              <button type="submit" value="Deposit" className="col-5 m-0 p-0 btn btn-default">Deposit</button>
                                            </form>
                                          </div>
                                          <div className="col-12 col-md-6 order-3 order-sm-4 pt-2 section">
                                            <h5>Deposited Credit</h5>
                                            <h6>ETH { this.state.gameCredit } </h6>
                                            <h6>USD { Math.round(this.state.gameCredit * this.state.exchange["USD"]* 100) / 100}</h6>
                                            <form className="form-group form-row" onSubmit={this.withdrawEther }>
                                              <input type="text" placeholder={this.state.gameCredit} disabled className="col-7 m-0 p-2" value={this.state.newWithdraw} onChange={this.handleNewWithdraw} />
                                              <button type="submit" value="Withdraw" className="col-5 m-0 p-0 btn btn-default">Withdraw</button>
                                            </form>
                                          </div>
                                          <div className="col-12 col-md-6 ml-md-auto order-4 order-sm-2 pt-2 mr-md-0 pr-md-1 ml-1 pl-1 locked section">
                                            <div className="rounded px-2 pt-2 pb-1">
                                              <h5>Locked Credit</h5>
                                              <h6>ETH { this.state.lockedDeposit } </h6>
                                              <h6>USD { Math.round(this.state.lockedDeposit * this.state.exchange["USD"]* 100) / 100}</h6>
                                            </div>
                                          </div>
                                      </div>
                                      {/* this is the part on the side, with ICONS*/}
                                      <div className="d-inline mr-0 pr-2 text-right ml-auto mt-auto">
                                        <Link to="/" className="d-block">
                                          <i className="fas fa-2x fa-fw fa-home mb-2"></i>
                                        </Link>
                                        <Link to="/about"  className="d-block">
                                          <i className="fas fa-2x fa-fw fa-info-circle mb-2"></i>
                                        </Link>
                                        <Link to="" className="d-block" onClick={ this.refreshWallet } >
                                          <i className="fas fa-2x fa-fw fa-sync-alt"></i>
                                        </Link>
                                      </div>
                                  </div>
                                  {/*this is the part that is always visible */}
                                  <div className="navbar-header w-100 p-0">
                                      <div className="row p-2">
                                          <div className="col-10 m-0 p-0 text-left align-middle">
                                            <span className="h4">ETH Wallet</span>
                                          </div>
                                          <div
                                            className="navbar-toggle col-2 m-0 p-0 pr-1 text-right "
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
