const GameRoundContract = artifacts.require("GameRound");
const TicTacToeGameContract = artifacts.require("TicTacToeGame");
const TicTacToeGameUtils = require('../../utils');
const ContractTester = require('../../../../core/test/contract_tester');

contract('TicTacToe game test cases', function(accounts) {
    const MAXIMUM_BET_SIZE_FOR_ALL = web3.toWei(100, "ether");
    const INITIAL_MAXIMUM_BET_SIZE = web3.toWei(10, "ether");
    const INITIAL_BET_SIZE = 1;
    let t;
    let game;
    let player1 = accounts[0];
    let player2 = accounts[1];
    let creator = accounts[2];

    before(async function () {
        t = new ContractTester(this, {
            accounts: { creator, player1, player2 }
        });
        game = await TicTacToeGameContract.deployed();
    })

    after(async function () {
    })

    beforeEach(async function () {
        t.beforeEachTest();
    })

    afterEach(async function () {
        t.afterEachTest();
    })

    async function digestGameRoundStatus(round) {
        let syncedTurn = (await round.getSyncedTurn.call()).toNumber();
        let gameOverReason = (await round.getGameOverReason.call()).toNumber();
        let causingSide = (await round.getCausingSide.call()).toNumber();
        console.log(`------------------------------------------------------`);
        console.log(`Round synced turn at ${syncedTurn}`);
        gameData = await round.getGameData.call();
        TicTacToeGameUtils.printGameData(gameData);
        if (gameOverReason) {
            gameOverReasonStr = await game.decodeGameOverReason.call(gameOverReason);
            console.log(`Game over caused by player ${causingSide}: ${gameOverReasonStr}`);
        }
        console.log(`------------------------------------------------------`);
        return {syncedTurn, gameOverReason, causingSide};
    }

    async function setupTypicalGameRound(options) {
        // create game round
        let round = await t.createContract('create GameRound', GameRoundContract,
            0/* cb */, 0/* gameEvent */, game.address, 2 /* expectedNumberOfPlayers */,
            { from: creator });

        assert.equal((await round.getState.call()).toNumber(), 0);
        await t.sendTransaction('round.ready', round.ready, { from: creator });
        assert.equal((await round.getState.call()).toNumber(), 1);

        await t.sendTransaction('round.acceptInvitation 1', round.acceptInvitation,
            1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: player1 });
        await t.sendTransaction('round.acceptInvitation 2', round.acceptInvitation,
            2, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: player2 });

        assert.equal((await round.getState.call()).toNumber(), 2);

        return { round };
    }

    async function playerTypicalGameRound(round) {
        let move;

        let moveData1 = TicTacToeGameUtils.createMoveData(1, 1);
        await t.sendTransaction(`round.makeMove 1 ${t.decodeMoveData(moveData1)}`, round.makeMove,
            1, moveData1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0, { from: player1 });
        move = await round.getMove.call(0);
        assert.equal(move[0].toNumber(), 1);
        assert.equal(move[1].toNumber(), moveData1);

        let moveData2 = TicTacToeGameUtils.createMoveData(2, 2);
        await t.sendTransaction(`round.makeMove 2 ${t.decodeMoveData(moveData2)}`, round.makeMove,
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
        await t.sendTransaction("round.syncGameData 2", round.syncGameData, 2, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 2);
        assert.equal(gameStatus.gameOverReason, 0);
        assert.equal(gameStatus.causingSide, 0);

        let moveData3 = TicTacToeGameUtils.createMoveData(0, 1);
        await t.sendTransaction(`round.makeMove 3 ${t.decodeMoveData(moveData3)}`, round.makeMove,
            1, moveData3, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player1 });

        let moveData4 = TicTacToeGameUtils.createMoveData(2, 1);
        await t.sendTransaction(`round.makeMove 4 ${t.decodeMoveData(moveData4)}`, round.makeMove,
            2, moveData4, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });

        let moveData5 = TicTacToeGameUtils.createMoveData(0, 2);
        await t.sendTransaction(`round.makeMove 5 ${t.decodeMoveData(moveData5)}`, round.makeMove,
            1, moveData5, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player1 });

        let moveData6 = TicTacToeGameUtils.createMoveData(2, 0);
        await t.sendTransaction(`round.makeMove 4 ${t.decodeMoveData(moveData6)}`, round.makeMove,
            2, moveData6, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0,  { from: player2 });

        await t.sendTransaction("round.syncGameData 6", round.syncGameData, 6, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurn, 6);
        assert.equal(gameStatus.gameOverReason, 1);
        assert.equal(gameStatus.causingSide, 2);
        assert.equal((await round.getState.call()).toNumber(), 3 /* round.State.Ended */);
    }

    it("a typical tictactoe game round, won by player 2", async function() {
        let setup = await setupTypicalGameRound();
        await playerTypicalGameRound(setup.round);
    })
});
