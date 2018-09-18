const Migrations = artifacts.require("./Migrations.sol");
const GameRoundLib = artifacts.require("GameRoundLib");
const AIWarPlatform = artifacts.require("AIWarPlatform");
const GameRound = artifacts.require("GameRound");
const TicTacToeGame = artifacts.require("TicTacToeGame");


async function reportGasUsageOfContractCreation(contract) {
    let txReceipt = await web3.eth.getTransactionReceipt(contract.transactionHash);
    let gasUsed = txReceipt.gasUsed;
    console.log(`Contract ${contract.constructor.contractName} created with gasUsed ${gasUsed}`);
}

module.exports = function(deployer) {
    deployer.then(async () => {
        await reportGasUsageOfContractCreation(await deployer.deploy(Migrations));

        await reportGasUsageOfContractCreation(await deployer.deploy(GameRoundLib));
        await deployer.link(GameRoundLib, [GameRound, AIWarPlatform]);

        let platform = await deployer.deploy(AIWarPlatform);
        await reportGasUsageOfContractCreation(platform);

        // TicTacToeGame
        let tictactoeGame = await deployer.deploy(TicTacToeGame);
        await reportGasUsageOfContractCreation(tictactoeGame);
        await platform.registerGame(tictactoeGame.address);
    }).catch(err => {
        console.log(`deployment failed: ${err.message}\n${err.stack}`);
    })
};
