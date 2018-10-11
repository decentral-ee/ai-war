const AIWarPlatformContract = artifacts.require("AIWarPlatform");
const OpenEtherbetGameEventContract = artifacts.require("OpenEtherbetGameEvent");
const GameRoundContract = artifacts.require("GameRound");
const RiggedGameContract = artifacts.require("RiggedGame");
const ContractTester = require('./contract_tester');

contract('System test cases', function(accounts) {
    const MAXIMUM_BET_SIZE_FOR_ALL = web3.toWei(100, "ether");
    const INITIAL_MAXIMUM_BET_SIZE = web3.toWei(10, "ether");
    const INITIAL_BET_SIZE = 1;
    const player1 = accounts[0];
    const player2 = accounts[1];
    const creator = accounts[2];
    let t;
    let game;
    let platform;

    before(async function () {
        t = new ContractTester(this, {
            accounts: { creator, player1, player2 }
        });
        platform = await AIWarPlatformContract.deployed();
        game = await t.createContract("RiggedGameContract created", RiggedGameContract,
            { from: creator });
        await t.sendTransaction("platform.registerGame", platform.registerGame,
            game.address, { from: creator });
    })

    after(async function () {
        console.log(`Total started ${(await platform.getTotalGameRoundStarted()).toNumber()} rounds`);
        console.log(`Total ended ${(await platform.getTotalGameRoundEnded()).toNumber()} rounds`);
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

    async function setupTypicalGameRound(options) {
        const gameEvent = await t.createContract('OpenEtherbetGameEventContract Created', OpenEtherbetGameEventContract,
            { from: creator });
        await t.sendTransaction("platform.registerGameEvent", platform.registerGameEvent,
            gameEvent.address, { from: creator });

        // deopsits
        await t.sendTransaction('gameEvent.deposit player1', gameEvent.deposit,
            { from: player1, value: INITIAL_MAXIMUM_BET_SIZE });
        assert.equal((await gameEvent.getDepositAmount(player1)).toNumber(), INITIAL_MAXIMUM_BET_SIZE);
        await t.sendTransaction('gameEvent.deposit player2', gameEvent.deposit,
            { from: player2, value: INITIAL_MAXIMUM_BET_SIZE });
        assert.equal((await gameEvent.getDepositAmount(player2)).toNumber(), INITIAL_MAXIMUM_BET_SIZE);

        // create game round
        let roundAddress = (await t.sendTransaction('platform.createGameRound', platform.createGameRound,
            gameEvent.address, game.address, 2 /* nSides */,
            { from: (options.createByPlayer1 ? player1 : creator) })).logs[0].address;
        assert.notEmpty(roundAddress);
        let round = GameRoundContract.at(roundAddress);

        // setup alloowances
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player1)), 0);
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player2)), 0);
        await t.sendTransaction('gameEvent.grantAllowance player1', gameEvent.grantAllowance,
            round.address, INITIAL_MAXIMUM_BET_SIZE,
            { from: player1 });
        await t.sendTransaction('gameEvent.grantAllowance player2', gameEvent.grantAllowance,
            round.address, INITIAL_MAXIMUM_BET_SIZE,
            { from: player2 });
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player1)), INITIAL_MAXIMUM_BET_SIZE);
        assert.equal(Number(await gameEvent.getGrantedAllowance.call(round.address, player2)), INITIAL_MAXIMUM_BET_SIZE);

        assert.equal((await round.getState.call()).toNumber(), 0);
        if (options.createByPlayer1) {
            await t.sendTransaction('round.selfInviteAndReady', round.selfInviteAndReady,
                1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE,
                { from: player1 });
        } else {
            await t.sendTransaction('round.ready', round.ready, { from: creator });
        }
        assert.equal((await round.getState.call()).toNumber(), 1);

        assert.equal((await platform.getGameRoundStartedByEvent(gameEvent.address)).toNumber(), 0);
        assert.equal((await platform.getGameRoundEndedByEvent(gameEvent.address)).toNumber(), 0);

        if (!options.createByPlayer1) {
            await t.sendTransaction('round.acceptInvitation 1', round.acceptInvitation,
                1, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, { from: player1 });
        }
        await t.sendTransaction('round.acceptInvitation 2', round.acceptInvitation,
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

    async function playerRiggedGameRound(gameEvent, round) {
        await t.sendTransaction('game rig', game.rig,
            1/* gameOverReason.HAS_WINNER */, 2/*causingSide*/, 0 /*gameViolationReason*/,
            { from: creator });
        await t.sendTransaction(`round.makeMove 1`, round.makeMove,
            1, 0 /* moveData */, INITIAL_MAXIMUM_BET_SIZE, INITIAL_BET_SIZE, false, 0, { from: player1 });

        await t.sendTransaction("round.syncGameData 0", round.syncGameData, 1, { from: creator });
        gameStatus = await digestGameRoundStatus(round);
        assert.equal(gameStatus.syncedTurns, 1);
        assert.equal(gameStatus.gameOverReason, 1);
        assert.equal(gameStatus.causingSide, 2);
        assert.equal((await round.getState.call()).toNumber(), 3 /* round.State.Ended */);

        let p1a = await web3.eth.getBalance(player1);
        let p2a = await web3.eth.getBalance(player2);
        await t.sendTransaction("round.settlePayout", round.settlePayout, { from: creator });
        await t.sendTransaction('gameEvent.grantAllowance player1 to zero', gameEvent.grantAllowance,
            round.address, 0,
            { from: player1 });
        await t.sendTransaction("gameEvent.withdrawAll 1", gameEvent.withdrawAll, { from: player1 });
        assert.equal((await gameEvent.getDepositAmount(player1)).toNumber(), 0);
        await t.sendTransaction('gameEvent.grantAllowance player2 to zero', gameEvent.grantAllowance,
            round.address, 0,
            { from: player2 });
        await t.sendTransaction("gameEvent.withdrawAll 2", gameEvent.withdrawAll, { from: player2 });
        assert.equal((await gameEvent.getDepositAmount(player2)).toNumber(), 0);
        let p1b = await web3.eth.getBalance(player1);
        let p2b = await web3.eth.getBalance(player2);
        let p1Withdrew = t.wei2ether(p1b - p1a);
        let p2Withdrew = t.wei2ether(p2b - p2a);
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

    it("a rigged game round, setup by creator, won by player 2", async function() {
        const roundsStartedByGame = (await platform.getGameRoundStartedByGame(game.address)).toNumber();
        const roundsEndedByGame = (await platform.getGameRoundEndedByGame(game.address)).toNumber();

        const setup = await setupTypicalGameRound({ createByPlayer1: false });

        assert.equal(1, (await platform.getGameRoundStartedByEvent(setup.gameEvent.address)).toNumber());
        assert.equal(0, (await platform.getGameRoundEndedByEvent(setup.gameEvent.address)).toNumber());
        assert.equal(roundsStartedByGame + 1, (await platform.getGameRoundStartedByGame(game.address)).toNumber());
        assert.equal(roundsEndedByGame, (await platform.getGameRoundEndedByGame(game.address)).toNumber());

        await playerRiggedGameRound(setup.gameEvent, setup.round);

        assert.equal(1, (await platform.getGameRoundStartedByEvent(setup.gameEvent.address)).toNumber());
        assert.equal(1, (await platform.getGameRoundEndedByEvent(setup.gameEvent.address)).toNumber());
        assert.equal(roundsStartedByGame + 1, (await platform.getGameRoundStartedByGame(game.address)).toNumber());
        assert.equal(roundsEndedByGame + 1, (await platform.getGameRoundEndedByGame(game.address)).toNumber());
    })

    it("a rigged game round, setup by player1, won by player 2", async function() {
        const setup = await setupTypicalGameRound({ createByPlayer1: true });
        await playerRiggedGameRound(setup.gameEvent, setup.round);
    })

    it("an unfinished game round", async function() {
        const roundsStartedByGame = (await platform.getGameRoundStartedByGame(game.address)).toNumber();
        const roundsEndedByGame = (await platform.getGameRoundEndedByGame(game.address)).toNumber();

        const setup = await setupTypicalGameRound({});

        assert.equal(roundsStartedByGame + 1, (await platform.getGameRoundStartedByGame(game.address)).toNumber());
        assert.equal(roundsEndedByGame, (await platform.getGameRoundEndedByGame(game.address)).toNumber());
        assert.equal((await platform.getGameRoundStartedByEvent(setup.gameEvent.address)).toNumber(), 1);
        assert.equal((await platform.getGameRoundEndedByEvent(setup.gameEvent.address)).toNumber(), 0);
    });
});
