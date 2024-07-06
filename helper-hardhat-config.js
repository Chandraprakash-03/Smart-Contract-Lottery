const { ethers } = require("hardhat")

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x9ddfaca8183c41ad55329bdeed9f6a8d53168b1b",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId:
            "12204885148341597938066255684363781865014343817206236442361334915412190738952",
        callbackGasLimit: "5000000",
        interval: "30",
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "5000000",
        interval: "30",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    developmentChains,
    networkConfig,
}
