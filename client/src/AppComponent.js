import { Component } from "react";
import truffleContract from "truffle-contract";
import Web3 from "web3";

const BLOCK_RANGE = 1000;
const MAXIMUM_BLOCK_HISTORY = 10000;

class AppComponent extends Component {
    getTruffleContract(contractJson) {
        const Contract = truffleContract(contractJson);
        Contract.setProvider(this.props.appState.web3.currentProvider);
        return Contract;
    }

    async getNPastLogs(n, eventSig = null, indexedParameters = [], address = null) {
        const that = this;
        const promise = new Promise(async function (resolve, reject) {
            var events = [];
            const topics = [ eventSig ? Web3.utils.sha3(eventSig) : null].concat(indexedParameters);
            const web3 = that.props.appState.web3;
            const latestBlockNumber = await web3.eth.getBlockNumber();
            const f = (toBlockNumber) => {
                const fromBlockNumber = Math.max(0, toBlockNumber - BLOCK_RANGE);
                console.log(`getNPastLogs ${fromBlockNumber}:${toBlockNumber} ${events.length} ${topics}`);
                if (toBlockNumber < 0 ||
                    fromBlockNumber <= 0 ||
                    latestBlockNumber - fromBlockNumber > MAXIMUM_BLOCK_HISTORY) {
                    return resolve(events);
                }
                web3.eth.getPastLogs({
                    address,
                    topics: topics,
                    fromBlock: web3.utils.toHex(fromBlockNumber),
                    toBlock: web3.utils.toHex(toBlockNumber),
                }, (err, result) => {
                    if (err) return reject(err);
                    if (result === null) return resolve(events);
                    events = events.concat(result);
                    if (events.length >= n) {
                        events.slice(0, MAXIMUM_BLOCK_HISTORY);
                        resolve(events);
                    } else {
                        f(fromBlockNumber - 1);
                    }
                });
            };
            f(latestBlockNumber);
        });
        return promise;
    }
}

export default AppComponent;
