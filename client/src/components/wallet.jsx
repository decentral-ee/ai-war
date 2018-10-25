import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Exchange from "./../utils/exchange.jsx";
import { Metamask, Gas, Transactions, Events, Scaler, Blockie, Button } from "dapparatus"

export default class Wallet extends Component {
    constructor(props) {
        super(props);
        this.depositEther = this.depositEther.bind(this);
        this.refreshWallet = this.refreshWallet.bind(this);
        this.withdrawEther = this.withdrawEther.bind(this);
        this.state = {
            networkString: null,
            accounts: '0x61157Ba1634c09805a5e320577c553F13af4F3E9',
            gameCredit: 0,
            lockedDeposit:0,
            newDeposit: 0,
            balance: 0
        };
    }
    async componentDidMount() {
        try {
            // Get network provider and web3 instance.
            this.setState({loaded : false, loading : true});
            const web3 = this.props.web3;
            const networkString = await web3.eth.net.getNetworkType()
            let accounts = await web3.eth.getAccounts();
            accounts = accounts[0];
            this.setState({ web3, networkString, accounts});
            this.setState({loaded : true, loading : false});
            this.refreshWallet();
        } catch (error) {
            console.error(error);
        }
    }
    handleNewDeposit = (e)=> {
      const val = e.target.value;
      if (/^(\d+(\.\d{1,18})?)|^(?![\s\S])$/.test(val)) {
        this.setState({
          newDeposit: val
        });
      }
    }
    async depositEther(e) {
        e.preventDefault();
        const {gameEvent, web3} = this.props;
        await gameEvent.deposit({
            from: this.state.accounts,
            value: web3.utils.toWei(this.state.newDeposit, "ether")
        });
    }
    handleNewWithdraw = (e) =>{
      const val = e.target.value;
      if (/^(\d+(\.\d{1,18})?)|^(?![\s\S])$/.test(val)) {
        this.setState({
          newWithdraw: val
        });
      }
    }
    async withdrawEther(e) {
        e.preventDefault();
        const {gameEvent} = this.props;
        await gameEvent.withdrawAll({
          from: this.state.accounts,
        });
    }
    async refreshWallet(e) {
    const {web3, gameEvent} = this.props;
        if (e) e.preventDefault();
        this.setState({loading : true});
        const {accounts} = this.state;
        const bal = await web3.eth.getBalance(accounts);
        const gameCreditInWei = await gameEvent.getDepositAmount.call(accounts);
        const lockedDepositInWei = await gameEvent.getTotalLockedBalance.call(accounts);
        const gameCredit = web3.utils.fromWei(gameCreditInWei.toString(), 'ether');
        const balance = web3.utils.fromWei(bal.toString(), 'ether');
        const lockedDeposit = web3.utils.fromWei(lockedDepositInWei.toString(), 'ether');
        this.setState({ gameCredit, balance, lockedDeposit, loading : false });
    }
    handleCurrencyChange = (e) => {
      this.setState({currency:e.target.value});
    }
  render() {
    const {networkString, balance, gameCredit, newDeposit, newWithdraw, lockedDeposit, loading, loaded, accounts, currency} = this.state;

    if( loaded === false){
      return(
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
                      {/*this is the part that is always visible */}
                      <div className="navbar-header w-100 p-0">
                          <div className="row p-2">
                              <div className="col-10 m-0 p-0 text-left align-middle">
                                <span className="h4">ETH Wallet</span>
                              </div>
                              <div
                                className="navbar-toggle col-2 m-0 p-0 pr-1 text-right "
                                >
                                <Link to="" className="d-block" >
                                  <i className={loading? "fas fa-2x fa-fw fa-sync-alt fa-spin" : "fas fa-2x fa-fw fa-sync-alt "}></i>
                                </Link>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </footer>
        </div>
      )
    }
    else{
      return(
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
                                <h4>Network : {networkString}</h4>
                                <select value={this.state.currency} onChange={this.handleCurrencyChange} >
                                  <option name="currency" value="USD" defaultValue> USD </option>
                                  <option name="currency" value="EUR"> EUR </option>
                                  <option name="currency" value="GBP"> GBP </option>
                                  <option name="currency" value="JPY"> JPY </option>
                                </select>
                              </div>
                              <div className="col-12 col-md-6 order-2 order-sm-3 pt-2 section">
                                <div className="row mx-0">
                                  <div className="my-auto">
                                    <a href={"https://ropsten.etherscan.io/address/" + accounts} target="_blank">
                                      <Blockie
                                        address={accounts}
                                        config={{size:6}}
                                      />
                                    </a>
                                  </div>
                                  <div className="col">
                                    <h5>Wallet Balance</h5>
                                    <h6>ETH { balance } </h6>
                                    <h6><Exchange value={ balance } currency={ currency } /></h6>
                                  </div>
                                </div>
                                <form className="form-group form-row" onSubmit={this.depositEther }>
                                  <input type="text" placeholder="Amount" className="col-7 m-0 p-2 " value={newDeposit} onChange={this.handleNewDeposit} />
                                  <button type="submit" value="Deposit" className="col-5 m-0 p-0 btn btn-default">Deposit</button>
                                </form>
                              </div>
                              <div className="col-12 col-md-6 order-3 order-sm-4 pt-2 section">
                                <div className="row mx-0">
                                  <div className="my-auto">
                                    <a href={"https://ropsten.etherscan.io/address/" + accounts} target="_blank">
                                      <Blockie
                                        address="0x140E19Bb012687c017A94288eb7Bd061B3838BC3"
                                        config={{size:6}}
                                      />
                                    </a>
                                  </div>
                                  <div className="col">
                                    <h5>Deposited Credit</h5>
                                    <h6>ETH { gameCredit } </h6>
                                    <h6><Exchange value={gameCredit} currency={currency} /></h6>
                                  </div>
                                </div>
                                <form className="form-group form-row" onSubmit={this.withdrawEther }>
                                  <input type="text" placeholder={gameCredit} disabled="true" className="col-7 m-0 p-2" value={newWithdraw} onChange={this.handleNewWithdraw} />
                                  <button type="submit" value="Withdraw" className="col-5 m-0 p-0 btn btn-default">Withdraw</button>
                                </form>
                              </div>
                              <div className="col-12 col-md-6 ml-md-auto order-4 order-sm-2 pt-2 mr-md-0 pr-md-1 ml-1 pl-1 locked section">
                                <div className="rounded px-2 pt-2 pb-1">
                                  <h5>Locked Credit</h5>
                                  <h6>ETH { lockedDeposit } </h6>
                                  <h6><Exchange value={ lockedDeposit } currency={ currency }/></h6>
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
                              <i className={loading? "fas fa-2x fa-fw fa-sync-alt fa-spin" : "fas fa-2x fa-fw fa-sync-alt "}></i>
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
      )

    }

  }
}

/*the idea would be to get all the wallet part, and take it out.
By making a sort of self-contained wallet component, I can reuse it
in the next project, simply changing maybe a few classes.
Classes could be made as attributes inside the
<wallet /> component, adding to the modularization.

The main issue is the inclusion of the whole Web3 stuff, that should only be
included once... not sure how to manage it. Maybe with an if(web3) then?


*/
