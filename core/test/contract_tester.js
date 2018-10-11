'use strict';

function ContractTester(testsuite, options) {
    let gasCounter = {};

    function countGas(params, gasUsed) {
        if (!params.from) throw Error('params.from is mandatory');
        let from = params.from;
        if (from in gasCounter) {
            gasCounter[from] += gasUsed;
        } else {
            gasCounter[from] = gasUsed;
        }
    }

    this.beforeEachTest = function () {
        console.log(`\n#### Starting test case: ${testsuite.currentTest.title}`);
        // reset gas counter
        gasCounter = {};
    }

    this.afterEachTest = function () {
        console.log(`# Gas usage summary:`);
        Object.keys(options.accounts).forEach(a => {
            console.log(`Account ${a} used gas ${gasCounter[options.accounts[a]]}`);
        });
        console.log(`#### Test case ended: ${testsuite.currentTest.title}\n`);
    }


    this.wei2ether = function (wei) {
        return web3.fromWei(wei, "ether");
    }

    this.getUsedGas = function(acc) {
        return gasCounter[acc];
    }

    this.digestGameRoundStatus = async function (game, round, gameDataVisualizer) {
        const syncedTurns = (await round.getSyncedTurns.call()).toNumber();
        const gameOverReason = (await round.getGameOverReason.call()).toNumber();
        const causingSide = (await round.getCausingSide.call()).toNumber();
        console.log(`------------------------------------------------------`);
        console.log(`Round synced number of turns: ${syncedTurns}`);
        const gameData = await round.getGameData.call();
        gameDataVisualizer(gameData);
        if (gameOverReason) {
            const gameOverReasonStr = await game.decodeGameOverReason.call(gameOverReason);
            console.log(`Game over caused by player ${causingSide}: ${gameOverReasonStr}`);
        }
        console.log(`------------------------------------------------------`);
        return {syncedTurns, gameOverReason, causingSide};
    }

    this.createContract = async function (topic, contract) {
        let fargs = Array.from(arguments).slice(2);
        let params = arguments[arguments.length-1];
        let contractClass = web3.eth.contract(contract.abi);
        params.data = contract.binary; // use binary instead of bytecode due to library links
        let contractCreationData = contractClass.new.getData.apply(null, fargs);
        let gasEstimation = await web3.eth.estimateGas({ data: contractCreationData });
        delete params.data; // not needed after gas estimated
        params.gas = gasEstimation + 20000;
        let instance = await contract.new.apply(contract, fargs);
        let txHash = instance.contract.transactionHash;
        let txReceipt = await web3.eth.getTransactionReceipt(txHash);
        let gasUsed = txReceipt.gasUsed;
        console.log(`${topic}: gasUsed ${gasUsed} at ${instance.address}`);
        countGas(params, gasUsed);
        return instance;
    }

    this.sendTransaction = async function (topic, f) {
        const fargs = Array.from(arguments).slice(2);
        let params = arguments[arguments.length-1];
        let gasEstimation = await f.estimateGas.apply(null, fargs);
        params.gas = gasEstimation + 20000;
        let tx = await f.apply(null, fargs);
        let gasUsed = tx.receipt.gasUsed;
        console.log(`${topic}: gasUsed ${gasUsed}`);
        countGas(params, gasUsed);
        return tx;
    }

    this.decodeMoveData = function (moveData) {
        return '0b' + moveData.toString(2).padStart(4, "0");
    }

    return this;
}

module.exports = ContractTester;
