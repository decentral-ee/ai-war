const { promisify } = require("es6-promisify");
const Web3Utils = require("web3-utils");
const crypto = require("webcrypto");

const GameRound = {
    State: {
        Preparing : 0,
        Ready : 1,
        InProgress : 2,
        Ended : 3
    },

    generateSecretMoveSalt: async function () {
        let salt = await promisify(crypto.randomBytes)(32);
        let saltHex = "0x" + salt.toString('hex');
        console.debug("generateSecretMoveSalt", saltHex);
        return saltHex;
    },

    createSecretMoveHash: function (moveData, salt) {
        let hash = Web3Utils.soliditySha3(
            { type: 'uint16', value: moveData },
            { type: 'uint256', value: salt });
        hash = Web3Utils.toHex(hash);
        return hash;
    }
};

module.exports = GameRound;
