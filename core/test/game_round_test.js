const OpenEtherbetGameEventContract = artifacts.require("OpenEtherbetGameEvent");
const GameRoundLib = artifacts.require("GameRoundLib");
const GameRoundContract = artifacts.require("GameRound");
const AIWarPlatformContract = artifacts.require("AIWarPlatform");
const TicTacToeGameContract = artifacts.require("TicTacToeGame");
const TicTacToeGame = require('../sdk/games/tictactoe_game');

contract('GameRound test cases', function(accounts) {
    const MAXIMUM_BET_SIZE_FOR_ALL = web3.toWei(100, "ether");
    const INITIAL_MAXIMUM_BET_SIZE = web3.toWei(10, "ether");
    const INITIAL_BET_SIZE = 1;
    let platform;
    let game;
    let player1 = accounts[0];
    let player2 = accounts[1];
    let creator = accounts[2];
    let gasCounter = {};

    function wei2ether(wei) {
        return web3.fromWei(wei, "ether");
    }

    function countGas(params, gasUsed) {
        let from = params.from || accounts[0];
        if (from in gasCounter) {
            gasCounter[from] += gasUsed;
        } else {
            gasCounter[from] = gasUsed;
        }
    }

    async function createContract(topic, contract) {
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

    async function sendTransaction(topic, f) {
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

    function decodeMoveData(moveData) {
        return '0b' + moveData.toString(2).padStart(4, "0");
    }

    async function digestGameRoundStatus(round) {
        let syncedTurn = (await round.getSyncedTurn.call()).toNumber();
        let gameOverReason = (await round.getGameOverReason.call()).toNumber();
        let causingSide = (await round.getCausingSide.call()).toNumber();
        console.log(`------------------------------------------------------`);
        console.log(`Round synced turn at ${syncedTurn}`);
        gameData = await round.getGameData.call();
        TicTacToeGame.printGameData(gameData);
        if (gameOverReason) {
            gameOverReasonStr = await game.decodeGameOverReason.call(gameOverReason);
            console.log(`Game over caused by player ${causingSide}: ${gameOverReasonStr}`);
        }
        console.log(`------------------------------------------------------`);
        return {syncedTurn, gameOverReason, causingSide};
    }

    async function setupTypicalGameRound(options) {
        let gameEvent = await createContract('OpenEtherbetGameEventContract Created', OpenEtherbetGameEventContract,
            { from: creator });
        await sendTransaction("platform.registerGameEvent", platform.registerGameEvent,
            gameEvent.address, { from: creator });

        // deopsits
        await sendTransaction('gameEvent.deposit player1', gameEvent.deposit,
            { from: player1, value: INITIAL_MAXIMUM_BET_SIZE });
        assert.equal((await gameEvent.getDepositAmount(player1)).toNumber(), INITIAL_MAXIMUM_BET_SIZE);
        await sendTransaction('gameEvent.deposit player2', gameEvent.deposit,
            { from: player2, value: INITIAL_MAXIMUM_BET_SIZE });
        assert.equal((await gameEvent.getDepositAmount(player2)).toNumber(), INITIAL_MAXIMUM_BET_SIZE);

        // create game round
        let roundAddress = (await sendTransaction('platform.createGameRound', platform.createGameRound,
            gameEvent.address, game.address, 2 /* expectedNumberOfPlayers */,
            { from: (options.createByPlayer1 ? player1 : creator) })).logs[0].address;
        assert.notEmpty(roundAddress);
        let round = GameRoundContract.at(roundAddress);

        // setup alloowances
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player1)), 0);
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player2)), 0);
        await sendTransaction('gameEvent.grantAllowance player1', gameEvent.grantAllowance,
            round.address, INITIAL_MAXIMUM_BET_SIZE,
            { from: player1 });
        await sendTransaction('gameEvent.grantAllowance player2', gameEvent.grantAllowance,
            round.address, INITIAL_MAXIMUM_BET_SIZE,
            { from: player2 });
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player1)), INITIAL_MAXIMUM_BET_SIZE);
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player2)), INITIAL_MAXIMUM_BET_SIZE);

        assert.equal((await round.getState.call()).toNumber(), 0);
        if (options.createByPlayer1) {
            await sendTransaction('round.selfInviteAndReady', round.selfInviteAndReady,
                1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE,
                { from: player1 });
        } else {
            await sendTransaction('round.ready', round.ready, { from: creator });
        }
        assert.equal((await round.getState.call()).toNumber(), 1);

        assert.equal((await platform.getGameRoundStartedByEvent(gameEvent.address)).toNumber(), 0);
        assert.equal((await platform.getGameRoundEndedByEvent(gameEvent.address)).toNumber(), 0);

        if (!options.createByPlayer1) {
            await sendTransaction('round.acceptInvitation 1', round.acceptInvitation,
                1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: player1 });
        }
        await sendTransaction('round.acceptInvitation 2', round.acceptInvitation,
            2, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: player2 });

        assert.equal((await round.getState.call()).toNumber(), 2);

        // allowances for the round should be locked away
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player1)), 0);
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player2)), 0);
        assert.equal(Number(await gameEvent.getLockedBalance.call(round.address, player1)), INITIAL_MAXIMUM_BET_SIZE);
        assert.equal(Number(await gameEvent.getLockedBalance.call(round.address, player2)), INITIAL_MAXIMUM_BET_SIZE);

        assert.equal((await platform.getGameRoundStartedByEvent(gameEvent.address)).toNumber(), 1);
        assert.equal((await platform.getGameRoundEndedByEvent(gameEvent.address)).toNumber(), 0);

        return { gameEvent, round };
    }

    async function playerTypicalGameRound(gameEvent, round) {
        let move;
        let gameData;

        let moveData1 = TicTacToeGame.createMoveData(1, 1);
        await sendTransaction(`round.makeMove 1 ${decodeMoveData(moveData1)}`, round.makeMove,
            1, moveData1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0, { from: player1 });
        move = await round.getMove.call(0);
        assert.equal(move[0].toNumber(), 1);
        assert.equal(move[1].toNumber(), moveData1);

        let moveData2 = TicTacToeGame.createMoveData(2, 2);
        await sendTransaction(`round.makeMove 2 ${decodeMoveData(moveData2)}`, round.makeMove,
            2, moveData2, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });
        move = await round.getMove.call(1);
        assert.equal(move[0].toNumber(), 2);
        assert.equal(move[1].toNumber(), moveData2);

        //console.log("!! move 0", (await round.moves.call(0)).toNumber().toString(2).padStart(16, "0"));
        //console.log("!! move 1", (await round.moves.call(1)).toNumber().toString(2).padStart(16, "0"));
        let gameStatus;
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 0);
        assert.equal(gameStatus.gameOverReason, 0);
        assert.equal(gameStatus.causingSide, 0);
        await sendTransaction("round.syncGameData 2", round.syncGameData, 2, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 2);
        assert.equal(gameStatus.gameOverReason, 0);
        assert.equal(gameStatus.causingSide, 0);

        let moveData3 = TicTacToeGame.createMoveData(0, 1);
        await sendTransaction(`round.makeMove 3 ${decodeMoveData(moveData3)}`, round.makeMove,
            1, moveData3, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player1 });

        let moveData4 = TicTacToeGame.createMoveData(2, 1);
        await sendTransaction(`round.makeMove 4 ${decodeMoveData(moveData4)}`, round.makeMove,
            2, moveData4, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });

        let moveData5 = TicTacToeGame.createMoveData(0, 2);
        await sendTransaction(`round.makeMove 5 ${decodeMoveData(moveData5)}`, round.makeMove,
            1, moveData5, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player1 });

        let moveData6 = TicTacToeGame.createMoveData(2, 0);
        await sendTransaction(`round.makeMove 4 ${decodeMoveData(moveData6)}`, round.makeMove,
            2, moveData6, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });

        await sendTransaction("round.syncGameData 6", round.syncGameData, 6, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 6);
        assert.equal(gameStatus.gameOverReason, 1);
        assert.equal(gameStatus.causingSide, 2);
        assert.equal((await round.getState.call()).toNumber(), 3 /* round.State.Ended */);

        let p1a = await web3.eth.getBalance(player1);
        let p2a = await web3.eth.getBalance(player2);
        await sendTransaction("round.settlePayout", round.settlePayout, { from: creator });
        await sendTransaction('gameEvent.grantAllowance player1 to zero', gameEvent.grantAllowance,
            round.address, 0,
            { from: player1 });
        await sendTransaction("gameEvent.withdrawAll 1", gameEvent.withdrawAll, { from: player1 });
        assert.equal((await gameEvent.getDepositAmount(player1)).toNumber(), 0);
        await sendTransaction('gameEvent.grantAllowance player2 to zero', gameEvent.grantAllowance,
            round.address, 0,
            { from: player2 });
        await sendTransaction("gameEvent.withdrawAll 2", gameEvent.withdrawAll, { from: player2 });
        assert.equal((await gameEvent.getDepositAmount(player2)).toNumber(), 0);
        let p1b = await web3.eth.getBalance(player1);
        let p2b = await web3.eth.getBalance(player2);
        let p1Withdrew = wei2ether(p1b - p1a);
        let p2Withdrew = wei2ether(p2b - p2a);
        console.log(`player 1 withdrew ${p1Withdrew}`);
        console.log(`player 2 withdrew ${p2Withdrew}`);
        assert.isTrue(p1Withdrew < 0 && p1Withdrew > -0.1);
        assert.isTrue(p2Withdrew > 19.9 && p2Withdrew < 20.0);
        assert.equal(Number(await gameEvent.getLockedBalance.call(round.address, player1)), 0);
        assert.equal(Number(await gameEvent.getLockedBalance.call(round.address, player2)), 0);

        assert.equal((await platform.getGameRoundStartedByEvent(gameEvent.address)).toNumber(), 1);
        assert.equal((await platform.getGameRoundEndedByEvent(gameEvent.address)).toNumber(), 1);

        assert.equal(Number(await gameEvent.getTotalGrantedAllowance.call(player1)), 0);
        assert.equal(Number(await gameEvent.getTotalGrantedAllowance.call(player2)), 0);
        assert.equal(Number(await gameEvent.getTotalLockedBalance.call(player1)), 0);
        assert.equal(Number(await gameEvent.getTotalLockedBalance.call(player2)), 0);
    }

    before(async function () {
        platform = await AIWarPlatformContract.deployed();
        game = await TicTacToeGameContract.deployed();
    })

    after(async function () {
        console.log(`Total started ${(await platform.getTotalGameRoundStarted()).toNumber()} rounds`);
        console.log(`Total ended ${(await platform.getTotalGameRoundEnded()).toNumber()} rounds`);
    })

    beforeEach(async function () {
        console.log(`\n#### Starting test case: ${this.currentTest.title}`);
        // reset gas counter
        gasCounter = {};
    })

    afterEach(async function () {
        console.log(`# Gas usage summary:`);
        console.log(`creator used gas ${gasCounter[creator]}`);
        console.log(`player1 used gas ${gasCounter[player1]}`);
        console.log(`player2 used gas ${gasCounter[player2]}`);
        console.log(`# Game stats summary:`);
        console.log(`Game started ${(await platform.getGameRoundStartedByGame(game.address)).toNumber()} rounds`);
        console.log(`Game ended ${(await platform.getGameRoundEndedByGame(game.address)).toNumber()} rounds`);
        console.log(`#### Test case ended: ${this.currentTest.title}\n`);
    })

    it("a typical tictactoe game round, setup by creator", async function() {
        let setup = await setupTypicalGameRound({ createByPlayer1: false });
        await playerTypicalGameRound(setup.gameEvent, setup.round);
    })

    it("a typical tictactoe game round, setup by player1", async function() {
        let setup = await setupTypicalGameRound({ createByPlayer1: true });
        await playerTypicalGameRound(setup.gameEvent, setup.round);
    })

    it("an unfinished tictactoe game round", async function() {
        let setup = await setupTypicalGameRound(false);
        let gameEvent = setup.gameEvent;
        assert.equal((await platform.getGameRoundStartedByEvent(gameEvent.address)).toNumber(), 1);
        assert.equal((await platform.getGameRoundEndedByEvent(gameEvent.address)).toNumber(), 0);
    });
});
