const AIWarPlatformContract = artifacts.require("AIWarPlatform");
const OpenEtherbetGameEventContract = artifacts.require("OpenEtherbetGameEvent");
const GameRoundContract = artifacts.require("GameRound");
const RiggedGameContract = artifacts.require("RiggedGame");
const ContractTester = require("./contract_tester");
const AIWarCore = require("..");

const chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

contract('GameRound test cases', function(accounts) {
    const MAXIMUM_BET_SIZE = web3.toWei(10, "ether");
    const BET_SIZE = web3.toWei(1, "ether");
    const creator = accounts[0];
    const player1 = accounts[1];
    const player2 = accounts[2];
    let t;
    let game;

    before(async function () {
        t = new ContractTester(this, {
            accounts: { creator, player1, player2 }
        });
        game = await t.createContract("RiggedGameContract created", RiggedGameContract,
            { from: creator });
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
        return await t.digestGameRoundStatus(
            game, round,
            gameData => console.log(`gameData ${gameData}`));
    }

    it("two players play a simple rigged game round", async function () {
        let round = await t.createContract('create GameRound', GameRoundContract,
            0/* cb */, 0/* gameEvent */, game.address, 2 /* nSides */,
            { from: creator });

        assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.Preparing);
        await t.sendTransaction('round.ready', round.ready, { from: creator });
        assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.Ready);
        await t.sendTransaction('round.acceptInvitation 1', round.acceptInvitation,
            1, MAXIMUM_BET_SIZE, BET_SIZE, { from: player1 });
        await t.sendTransaction('round.acceptInvitation 2', round.acceptInvitation,
            2, MAXIMUM_BET_SIZE, BET_SIZE, { from: player2 });

        await t.sendTransaction('game rig', game.rig,
            1/* gameOverReason.HAS_WINNER */, 2/*causingSide*/, 0/*gameViolationReason*/,
            { from: creator });

        await t.sendTransaction(`round.makeMove 1`, round.makeMove,
            1 /* side */, 11 /* moveData */, MAXIMUM_BET_SIZE, BET_SIZE, false, 0, { from: player1 });
        assert.deepEqual([1, 11], (await round.getMove.call(0)).map(bn => bn.toNumber()));
        await t.sendTransaction(`round.makeMove 2`, round.makeMove,
            2 /* side */, 21 /* moveData */, MAXIMUM_BET_SIZE, BET_SIZE, false, 0, { from: player2 });
        assert.deepEqual([2, 21], (await round.getMove.call(1)).map(bn => bn.toNumber()));
        await expect(round.getMove.call(2)).to.eventually.be.rejected;
        await t.sendTransaction("round.syncGameData 2", round.syncGameData, 2, { from: creator });
        assert.equal((await round.getSyncedTurns.call()).toNumber(), 2);

        assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.Ended);
        assert.equal((await round.getCausingSide.call()).toNumber(), 2);
        assert.equal((await round.getGameOverReason.call()).toNumber(), AIWarCore.Game.GameOverReason.HAS_WINNER);
    })

    it("players play with secret moves", async function () {
        let round = await t.createContract('create GameRound', GameRoundContract,
            0/* cb */, 0/* gameEvent */, game.address, 2 /* nSides */,
            { from: creator });
        await t.sendTransaction('round.ready', round.ready, { from: creator });
        await t.sendTransaction('round.acceptInvitation 1', round.acceptInvitation,
            1, MAXIMUM_BET_SIZE, BET_SIZE, { from: player1 });
        await t.sendTransaction('round.acceptInvitation 2', round.acceptInvitation,
            2, MAXIMUM_BET_SIZE, BET_SIZE, { from: player2 });

        const salt1 = await AIWarCore.GameRound.generateSecretMoveSalt();
        const salt2 = await AIWarCore.GameRound.generateSecretMoveSalt();
        const badSalt = await AIWarCore.GameRound.generateSecretMoveSalt();

        await t.sendTransaction(`round.makeSecretMove 1`, round.makeSecretMove,
            1 /* side */, AIWarCore.GameRound.createSecretMoveHash(11, salt1),
            MAXIMUM_BET_SIZE, BET_SIZE, false, 0, { from: player1 });
        await expect(round.getMove.call(0)).to.eventually.be.rejected;

        await t.sendTransaction(`round.makeSecretMove 2`, round.makeSecretMove,
            2 /* side */, AIWarCore.GameRound.createSecretMoveHash(21, salt2),
            MAXIMUM_BET_SIZE, BET_SIZE, false, 0, { from: player2 });
        await expect(round.getMove.call(1)).to.eventually.be.rejected;

        await expect(t.sendTransaction("round.syncGameData 2",
            round.syncGameData, 2, { from: creator }))
            .to.eventually.be.rejected;
        assert.equal(await round.getSyncedTurns.call(), 0);

        // bad salt should be rejected
        await expect(t.sendTransaction(`round.revealSecretMove 1`, round.revealSecretMove,
            0 /* turn */, 11, badSalt, { from: player1 }))
            .to.eventually.be.rejected;

        await t.sendTransaction(`round.revealSecretMove 1`, round.revealSecretMove,
            0 /* turn */, 11, salt1, { from: player1 });
        await t.sendTransaction(`round.revealSecretMove 2`, round.revealSecretMove,
            1 /* turn */, 21, salt2, { from: player2 });
        assert.deepEqual([1, 11], (await round.getMove.call(0)).map(bn => bn.toNumber()));
        assert.deepEqual([2, 21], (await round.getMove.call(1)).map(bn => bn.toNumber()));

        await t.sendTransaction("round.syncGameData 2", round.syncGameData, 2, { from: creator });
        assert.equal((await round.getSyncedTurns.call()).toNumber(), 2);

        assert.equal((await round.getState.call()).toNumber(), AIWarCore.GameRound.State.Ended);
        assert.equal((await round.getCausingSide.call()).toNumber(), 2);
        assert.equal((await round.getGameOverReason.call()).toNumber(), AIWarCore.Game.GameOverReason.HAS_WINNER);
    })
})
