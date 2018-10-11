const path = require('path');
const fs = require('fs');
const jq = require('node-jq');

const CONTRACTS = [
    'Migrations',
    'AIWarPlatform',
    'OpenEtherbetGameEvent'
]

const DEPLOYMENTS_FILE=path.resolve(__dirname, '..', 'sdk', 'deployments.json');

function extractForContract(deployments, networkId, contractName) {
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

module.exports = function(callback) {
    try {
        deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE));

        web3.version.getNetwork(async (e, networkId) => {
            if (e) return callback(e);
            console.log(`Network ID: ${networkId}`);
            if (!deployments.networks) deployments.networks = {};
            deployments.networks[networkId] = {}

            await Promise.all(CONTRACTS.map(extractForContract.bind(null, deployments, networkId)));
            let deploymentsJSON = JSON.stringify(deployments, ' ', 4);

            console.log(`Writing to ${DEPLOYMENTS_FILE}...`);
            console.log(deploymentsJSON);
            fs.writeFileSync(DEPLOYMENTS_FILE, deploymentsJSON);
            console.log('Done');

            callback();
        })
    } catch (e) {
        console.error("error: ", e);
        callback(e);
    }
}
