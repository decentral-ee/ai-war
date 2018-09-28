const path = require('path');
const fs = require('fs');
const jq = require('node-jq');
const util = require('util');

const CONTRACTS = [
    'Migrations',
    'AIWarPlatform',
    'OpenEtherbetGameEvent'
]

const DEPLOYMENTS_FILE=path.resolve(__dirname, '..', 'sdk', 'deployments.json');
let deployments;
let networkId;

function extractForContract(contractName) {
    return jq
        .run(`.networks["${networkId}"].address`, './build/contracts/' + contractName + '.json')
        .then(deployedAddress => {
            deployments.networks[networkId][contractName] = {
                deployedAddress : JSON.parse(deployedAddress)
            };
        })
        .catch(e => {
            console.error('Failed extracting: ', contractName, e);
        });
    
}

module.exports = async function(callback) {
    try {
        deployments = JSON.parse(await util.promisify(fs.readFile)(DEPLOYMENTS_FILE));

        networkId = await util.promisify(web3.version.getNetwork)();
        console.log(`Network ID: ${networkId}`);
        if (!deployments.networks) deployments.networks = {};
        deployments.networks[networkId] = {}

        await Promise.all(CONTRACTS.map(extractForContract));
        let deploymentsJSON = JSON.stringify(deployments, ' ', 4);

        console.log(`Writing to ${DEPLOYMENTS_FILE}...`);
        console.log(deploymentsJSON);
        await util.promisify(fs.writeFile)(DEPLOYMENTS_FILE, deploymentsJSON);
        console.log('Done');

        callback();
    } catch (e) {
        callback(e);
    }
}
