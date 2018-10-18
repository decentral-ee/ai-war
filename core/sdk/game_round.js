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
        salt = "0x" + salt.toString('hex');
        let bn = Web3Utils.toBN(salt);
        bn = Web3Utils.toHex(bn);
        console.debug("generateSecretMoveSalt", bn);
        return bn;
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
