let localNetwork = {};
try { localNetwork = require('./deployments.local.json') } catch(e) {}

let ropstenNetwork = {};
try { ropstenNetwork = require('./deployments.ropsten.json') } catch(e) {}

module.exports = Object.assign(localNetwork, ropstenNetwork);
