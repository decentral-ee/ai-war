'use strict';

const GameRoundContract = artifacts.require("GameRound");
const RPSGameContract = artifacts.require("RPSGame");
const RPSGameUtils = require('../../utils');
const AIWarCore = require("../../../../core");
const ContractTester = require('../../../../core/test/contract_tester');

contract('RPS game test cases', function(accounts) {
    const MAXIMUM_BET_SIZE = web3.toWei(10, "ether");
    const BET_SIZE = web3.toWei(1, "ether");
    const creator = accounts[0];
    const player1 = accounts[1];
    const player2 = accounts[2];
    const player3 = accounts[3];
    let t;
    let game;

    before(async function () {
        t = new ContractTester(this, {
            accounts: { creator, player1, player2, player3 }
        });
        game = await RPSGameContract.deployed();
    })

    after(async function () {
    })

    beforeEach(async function () {
        t.beforeEachTest();
    })

    afterEach(async function () {
        t.afterEachTest();
    })

    it("test all two players combinations", async function() {
        async function playCombination(moveA, moveB, expectedResult) {
            let round = await t.createContract('create GameRound', GameRoundContract,
                0/* cb */, 0/* gameEvent */, game.address, 2 /* nSides */,
                { from: creator });
            await t.sendTransaction('round.ready', round.ready, { from: creator });
            await t.sendTransaction('round.acceptInvitation 1', round.acceptInvitation,
                1, MAXIMUM_BET_SIZE, BET_SIZE, { from: player1 });
            await t.sendTransaction('round.acceptInvitation 2', round.acceptInvitation,
                2, MAXIMUM_BET_SIZE, BET_SIZE, { from: player2 });

            await t.sendTransaction(`round.makeMove 1`, round.makeMove,
                1, moveA /* moveData */,
                MAXIMUM_BET_SIZE, BET_SIZE, false, 0, { from: player1 });

            // game data sync without all players should not advance
            await t.sendTransaction("round.syncGameData 2", round.syncGameData, 1, { from: creator });
            assert.equal((await round.getSyncedTurns.call()).toNumber(), 0);

            await t.sendTransaction(`round.makeMove 2`, round.makeMove,
                2, moveB /* moveData */,
                MAXIMUM_BET_SIZE, BET_SIZE, false, 0, { from: player2 });

            await t.sendTransaction("round.syncGameData 2", round.syncGameData, 2, { from: creator });
            assert.equal((await round.getSyncedTurns.call()).toNumber(), 2);
            if (expectedResult > 0) {
                assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.Ended);
                assert.equal((await round.getGameOverReason.call()).toNumber(), AIWarCore.Game.GameOverReason.HAS_WINNER);
                assert.equal((await round.getCausingSide.call()).toNumber(), 1);
            } else if (expectedResult < 0) {
                assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.Ended);
                assert.equal((await round.getGameOverReason.call()).toNumber(), AIWarCore.Game.GameOverReason.HAS_WINNER);
                assert.equal((await round.getCausingSide.call()).toNumber(), 2);
            } else {
                assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.InProgress);
            }
        };
        await playCombination(RPSGameUtils.Move.Rock, RPSGameUtils.Move.Paper, -1);
        await playCombination(RPSGameUtils.Move.Rock, RPSGameUtils.Move.Scissor, 1);
        await playCombination(RPSGameUtils.Move.Rock, RPSGameUtils.Move.Rock, 0);
        await playCombination(RPSGameUtils.Move.Paper, RPSGameUtils.Move.Scissor, -1);
        await playCombination(RPSGameUtils.Move.Paper, RPSGameUtils.Move.Rock, 1);
        await playCombination(RPSGameUtils.Move.Paper, RPSGameUtils.Move.Paper, 0);
        await playCombination(RPSGameUtils.Move.Scissor, RPSGameUtils.Move.Scissor, 0);
        await playCombination(RPSGameUtils.Move.Scissor, RPSGameUtils.Move.Rock, -1);
        await playCombination(RPSGameUtils.Move.Scissor, RPSGameUtils.Move.Paper, 1);
    })
});
