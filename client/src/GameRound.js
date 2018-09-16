import React, { Component } from "react";
import GameRoundContract from "./contracts/GameRound.json";
import truffleContract from "truffle-contract";

class GameRound extends Component {
    state = {};

    componentDidMount = async () => {
        // Get the contract instance.
        const Contract = truffleContract(GameRoundContract);
        Contract.setProvider(this.props.appState.web3.currentProvider);
        //const instance = null;//await Contract.deployed();
    }

    runExample = async () => {
      //const { accounts, contract } = this.state;

      // Stores a given value, 5 by default.
      //await contract.set(5, { from: accounts[0] });

      // Get the value from the contract to prove it worked.
      //const response = await contract.get();

      // Update state with the result.
      //this.setState({ storageValue: response.toNumber() });
    };

    render() {
        return (
            <div>
                <h2>GameRound</h2>
            </div>
        );
    }
}

export default GameRound;
