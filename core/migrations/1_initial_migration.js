const Migrations = artifacts.require("./Migrations.sol");
const {
    reportGasUsageOfContractCreation
} = require('./utils');

module.exports = function(deployer, network, accounts) {
    console.log("accounts", accounts);
    deployer.then(async () => {
        await reportGasUsageOfContractCreation(await deployer.deploy(Migrations));
    }).catch(err => {
        console.log(`deployment failed: ${err.message}\n${err.stack}`);
    })
};
