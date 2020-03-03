var WayCoin = artifacts.require("./contracts/WayCoin.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(WayCoin, 'WAY', 'Who Are You', accounts[0], accounts[1], accounts[2]).then(() => {
    console.log(`WayCoin deployed: address = ${WayCoin.address}`);
  })
};
