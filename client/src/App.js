import React, { Component } from "react";
import Home from './Home';
import GameRule from './GameRule';
import GameRound from './GameRound';
import { BrowserRouter as Router, Link, Switch, Route, Redirect } from 'react-router-dom';
import getWeb3 from "./utils/getWeb3";
import truffleContract from "truffle-contract";

import "./App.css";

class App extends Component {
    state = { web3: null, accounts: null };

    componentDidMount = async () => {
        try {
            // Get network provider and web3 instance.
            const web3 = await getWeb3();

            // Use web3 to get the user's accounts.
            const accounts = await web3.eth.getAccounts();

            // Set web3, accounts, and contract to the state, and then proceed with an
            // example of interacting with the contract's methods.
            this.setState({ web3, accounts });
        } catch (error) {
            console.error(error);
        }
    };

    render() {
        if (!this.state.web3) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }
        return (
            <Route>
                <div>
                    <div className="App">
                        <h1>Welcome to AI War!</h1>
                    </div>
                    <Link to="/">Home</Link>
                    <Switch>
                        <Route exact path="/" render={(props) => <Home {...props} appState={this.state}/>}/>
                        <Route path="/g/:gameRuleAddress" render={(props) => <GameRule {...props} appState={this.state}/>}/>
                        <Route path="/r/:gameRoundAddress" render={(props) => <GameRound {...props} appState={this.state}/>}/>
                        <Redirect from="/" to="/" />
                    </Switch>
                </div>
            </Route>
        );
    }
}

export default App;
