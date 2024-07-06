const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = ethers.parseEther("0.25")
const GAS_PRICE_LINK = 1e9

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        console.log("Local network detected! Deploying Mocks...")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true,
            // waitConfirmations: network.config.blockConfirmations || 1,
        })
        log("Mocks Deployed!")
        log("----------------------------")
    }
}

module.exports.tags = ["all", "mocks"]
