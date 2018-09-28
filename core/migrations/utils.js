'use strict';

function promisifiedCb(inner) {
  return new Promise((resolve, reject) => {
    inner((err, res) => {
      if (err) { reject(err) }
      resolve(res);
    })
  })
}

async function reportGasUsageOfContractCreation(contract) {
    let web3 = contract.constructor.web3;
    let txReceipt = await promisifiedCb(cb => web3.eth.getTransactionReceipt(contract.transactionHash, cb));
    let gasUsed = txReceipt.gasUsed;
    console.log(`Contract ${contract.constructor.contractName} created with gasUsed ${gasUsed}`);
}

module.exports = {
    reportGasUsageOfContractCreation: reportGasUsageOfContractCreation
};
