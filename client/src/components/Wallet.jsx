import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Exchange from "./../utils/exchange.jsx";
import { Blockie } from "dapparatus"
export default class Wallet extends Component {
    constructor(props) {
        super(props);
        this.walletArea = React.createRef();
        this.depositEther = this.depositEther.bind(this);
        this.refreshWallet = this.refreshWallet.bind(this);
        this.withdrawEther = this.withdrawEther.bind(this);
        this.state = {
            networkString: null,
            accounts: null,
            gameCredit: 0,
            lockedDeposit:0,
            newDeposit: 0,
            balance: 0,
            walletHeight: 100
        };
    }
    componentWillReceiveProps(props) {
      const { helper } = this.props;
      // Get network provider and web3 instance.
      if (helper === 'MetaMask'){
        this.refreshWallet();
      }
    }

    componentDidMount() {
      const { helper } = this.props;
      // Get network provider and web3 instance.
      if (helper === 'MetaMask'){
        this.refreshWallet();
      }
      const walletHeight = this.walletArea.current && this.walletArea.current.clientHeight;
      this.setState({walletHeight});
    }
    async refreshWallet(e) {
      if (e) e.preventDefault();
      const {web3, gameEvent } = this.props;
      if(!this.state.networkString){
        const networkString = await web3.eth.net.getNetworkType();
        this.setState({networkString});
      }
      if( !this.state.accounts ){
        const accounts= await web3.eth.getAccounts();
        if (accounts.length > 0 ) {
          this.setState({accounts});
        }
      }
      if(this.state.accounts && this.state.accounts.length>0){
        const {accounts} = this.state;
        const bal = await web3.eth.getBalance(accounts[0]);
        const gameCreditInWei = await gameEvent.getDepositAmount.call(accounts[0]);
        const lockedDepositInWei = await gameEvent.getTotalLockedBalance.call(accounts[0]);
        const gameCredit = web3.utils.fromWei(gameCreditInWei.toString(), 'ether');
        const balance = web3.utils.fromWei(bal.toString(), 'ether');
        const lockedDeposit = web3.utils.fromWei(lockedDepositInWei.toString(), 'ether');
        this.setState({ gameCredit, balance, lockedDeposit});
      }
      await new Promise(resolve => setTimeout(resolve,777));
      this.refreshWallet();
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

    handleCurrencyChange = (e) => {
      this.setState({currency:e.target.value});
    }

  render() {
    const {networkString, balance, gameCredit, newDeposit, newWithdraw, lockedDeposit,  accounts, currency, walletHeight} = this.state;
    const {helper} = this.props;
    return(
      <div>
        <div id="fixScrolling" style={{height : (walletHeight + 25) + 'px'}}></div>
        <div className="container fixed-bottom wallet" ref={this.walletArea}>
            <footer>
              <div className="navbar navbar-inverse navbar-fixed-bottom p-1 py-2">
                  <div className="container p-0">
                      {/* this is the icons (dots) at the top of the opened menu on mobile only */}
                      <div className="w-100 row p-0 m-0 d-sm-none">
                        <div className="col-7 text-right">
                          <i className="navbar-toggle fas fa-ellipsis-h d-inline"  data-toggle="collapse" data-target=".footer-body"></i>
                        </div>
                      </div>
                      { accounts? (
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
                                    <a href={"https://ropsten.etherscan.io/address/" + accounts[0]} target="_blank" rel="noopener noreferrer">
                                      <Blockie
                                        address={accounts[0]}
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
                                  <button type="submit" value="Deposit" className="col-5 m-0 p-0 btn btn-primary">Deposit</button>
                                </form>
                              </div>
                              <div className="col-12 col-md-6 order-3 order-sm-4 pt-2 section">
                                <div className="row mx-0">
                                  <div className="my-auto">
                                    <a href={"https://ropsten.etherscan.io/address/0x140E19Bb012687c017A94288eb7Bd061B3838BC3"} target="_blank" rel="noopener noreferrer">
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
                                  <input type="text" placeholder={gameCredit} disabled={true} className="col-7 m-0 p-2" value={newWithdraw} onChange={this.handleNewWithdraw} />
                                  <button type="submit" value="Withdraw" className="col-5 m-0 p-0 btn btn-primary">Withdraw</button>
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
                            {/*
                            <Link to="" className="d-block" onClick={ this.refreshWallet } >
                              <i className={loading? "fas fa-2x fa-fw fa-sync-alt fa-spin" : "fas fa-2x fa-fw fa-sync-alt "}></i>
                            </Link>*/}
                          </div>
                        </div>
                      ) : null }
                      {/*this is the part that is always visible */}
                      <div className="navbar-header w-100 p-0">
                        <div className="row p-2">
                          <div className="col-10 m-0 p-0 text-left align-middle">
                            <span className="h4">
                              {
                                helper === 'Infura'
                                ? (
                                      <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                                        Please install MetaMask to use AiWar
                                      </a>
                                  )
                                : (
                                    helper === 'MetaMask'
                                    ? (
                                        "ETH Wallet"
                                      )
                                    : (
                                      helper === 'locked'
                                      ? (
                                        "Please unlock metamask to use AiWar"
                                      )
                                      : (
                                        "Please change your network to Ropsten"
                                      )
                                    )
                                  )
                              }
                             </span>
                            </div>
                              { helper==='MetaMask' ? (
                                <div className="navbar-toggle col-2 m-0 p-0 pr-1 text-right "
                                  data-toggle="collapse"
                                  data-target=".footer-body"
                                  >
                                  <Link to="#">
                                    <i className="d-inline fa-2x fas myChevron"></i>
                                  </Link>
                                </div>
                                ) : (
                                  <div className="navbar-toggle col-2 m-0 p-0 pr-1 text-right " >
                                    {
                                      helper==='Infura' ? (
                                        <a href="https://metamask.io/"target="_blank" rel="noopener noreferrer">
                                          <img src="/MetaMask.png" alt='MetaMaskLogo' style={{width: 2.5 + 'em'}}/>
                                        </a>
                                      ) : (
                                        <img src="/MetaMask.png" alt='MetaMaskLogo' style={{width: 2.5 + 'em'}}/>
                                      )
                                    }
                                  </div>
                                )
                              }
                          </div>
                      </div>
                  </div>
              </div>
          </footer>
        </div>
      </div>
    )
  }
}
