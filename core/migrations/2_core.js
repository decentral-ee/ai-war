const GameRoundLib = artifacts.require("GameRoundLib");
const AIWarPlatform = artifacts.require("AIWarPlatform");
const GameRound = artifacts.require("GameRound");
const TicTacToeGame = artifacts.require("TicTacToeGame");
const RPSGame = artifacts.require("RPSGame");
const OpenEtherbetGameEvent = artifacts.require("OpenEtherbetGameEvent");
const {
    reportGasUsageOfContractCreation
} = require('./utils');

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        await reportGasUsageOfContractCreation(await deployer.deploy(GameRoundLib));
        await deployer.link(GameRoundLib, [GameRound, AIWarPlatform]);

        let platform = await deployer.deploy(AIWarPlatform);
        await reportGasUsageOfContractCreation(platform);

        let openEtherbetGameEvent = await deployer.deploy(OpenEtherbetGameEvent);
        await reportGasUsageOfContractCreation(openEtherbetGameEvent);
        await platform.registerGameEvent(openEtherbetGameEvent.address);

        // TicTacToeGame
        let tictactoeGame = await deployer.deploy(TicTacToeGame);
        await reportGasUsageOfContractCreation(tictactoeGame);
        await platform.registerGame(tictactoeGame.address);

        // RPSGame
        let rpsGame = await deployer.deploy(RPSGame);
        await reportGasUsageOfContractCreation(rpsGame);
        await platform.registerGame(rpsGame.address);
    }).catch(err => {
        console.log(`deployment failed: ${err.message}\n${err.stack}`);
    })
};
