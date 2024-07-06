const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")
// const toNumber = require("bn.js")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit test", async function () {
          let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = (await raffle.getInterval()).toString()
          })

          describe("constructor", function () {
              it("initializes the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })
          describe("enterRaffle", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__notEnoughETHEntered",
                  )
              })
              it("records players when they enter", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits event on enter", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter",
                  )
              })
              it("doesn't allow entrance when raffle is calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)

                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.request({ method: "evm_mine" })

                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee }),
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("returns flase if people haven't send any ETH", async function () {
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds - 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })

              it("returns true if enough time has passed, has players and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", function () {
              it("it can only run if checkupkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts if checkupkeep is false", async function () {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded",
                  )
              })
              it("updates the raffle state, emits the events and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.send("evm_mine", [])
                  const txResponse = await raffle.performUpkeep("0x")
                  const txReceipt = await txResponse.wait(1)
                  const requestId = txReceipt.logs[1].args.requestId.toString()
                  const req = parseInt(requestId)
                  const raffleState = await raffle.getRaffleState()
                  assert(req > 0)
                  assert(raffleState.toString() == "1")
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const intervalInSeconds = parseInt(interval)
                  await network.provider.send("evm_increaseTime", [intervalInSeconds + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("only be called after perfomUpkeep", async function () {
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.target),
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.target),
                  ).to.be.revertedWith("nonexistent request")
              })

              it("picks a winner, resets the lottery, sends the money", async function () {
                  const additionalEntrances = 3
                  const startingAccountIndex = 1
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrances;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Found the event")
                          try {
                              //   console.log(accounts[2].address)
                              //   console.log(accounts[0].address)
                              //   console.log(accounts[1].address)
                              //   console.log(accounts[3].address)
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[1],
                              )

                              console.log("recentWinner:", recentWinner)
                              //   console.log("raffleState:" raffleState.toString())
                              //   console.log("endingTimeStamp:", endingTimeStamp)
                              //   console.log("numPlayers:", numPlayers.toString())

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              const endingBalance = parseInt(winnerEndingBalance.toString())
                              const startingBalance = parseInt(winnerStartingBalance.toString())
                              const commonEntranceFee = parseInt(raffleEntranceFee.toString())
                              const otherEntranceFee = commonEntranceFee * additionalEntrances

                              assert.approximately(
                                  Number(endingBalance.toString()),
                                  Number(
                                      (
                                          startingBalance +
                                          otherEntranceFee +
                                          commonEntranceFee
                                      ).toString(),
                                  ),
                                  0.000001e22,
                              )

                              resolve() // Resolve the promise after all checks pass
                          } catch (e) {
                              console.error("Error during WinnerPicked event handling:", e)
                              reject(e) // Pass the error to reject
                          }
                      })
                      const tx = await raffle.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      const winnerStartingBalance = await ethers.provider.getBalance(accounts[1])
                      await VRFCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.logs[1].args.requestId,
                          raffle.target,
                      )
                  })
              })
          })
      })
