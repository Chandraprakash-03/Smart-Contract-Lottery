# Raffle Smart Contract
## Overview
This Solidity contract implements a decentralized raffle using Chainlink VRF v2 for randomness and Chainlink Keepers for automation. Users can enter by paying a fee, and a random winner is periodically selected.

### Features
- Entrance Fee: Users must pay to enter.
- Random Winner: Uses Chainlink VRF for fair winner selection.
- Automated Upkeep: Uses Chainlink Keepers to automate the process.
## Contract Details
### Imports
- Chainlink VRFConsumerBaseV2
- Chainlink VRFCoordinatorV2Interface
- Chainlink KeeperCompatible
### Errors
- Raffle__notEnoughETHEntered
- Raffle__TransferFailed
- Raffle__NotOpen
- Raffle__UpkeepNotNeeded
### Constructor Parameters
- vrfCoordinatorV2: Address of the VRF Coordinator.
- entranceFee: Fee to enter the raffle.
- gasLane: Gas lane for VRF.
- subscriptionId: Subscription ID for VRF.
- callbackGasLimit: Gas limit for callback.
- interval: Time interval for upkeep checks.
### State Variables
- i_entranceFee: Entrance fee.
- s_players: List of players.
- i_vrfCoordinator: VRF Coordinator interface.
- i_gasLane: Gas lane for VRF.
- i_subscriptionId: Subscription ID.
- i_callbackGasLimit: Callback gas limit.
- s_recentWinner: Most recent winner.
- s_raffleState: Raffle state.
- s_lastTimeStamp: Last timestamp.
- i_interval: Upkeep interval.
### Enums
- RaffleState: OPEN, CALCULATING
### Events
- RaffleEnter: Player entered.
- RequestedRaffleWinner: Winner requested.
- WinnerPicked: Winner picked.
## Functions
### Public Functions
- enterRaffle(): Enter the raffle.
- checkUpkeep(bytes memory): Check if upkeep is needed.
- performUpkeep(bytes memory): Perform upkeep and request randomness.
- fulfillRandomWords(uint256, uint256[]): Handle randomness and pick winner.
### View / Pure Functions
- getEntranceFee(): Returns entrance fee.
- getPlayer(uint256): Returns player by index.
- getRecentWinner(): Returns recent winner.
- getRaffleState(): Returns raffle state.
- getNumberOfPlayers(): Returns number of players.
- getLatestTimeStamp(): Returns last timestamp.
- getRequestConfirmations(): Returns request confirmations.
- getInterval(): Returns interval.
- getSubscriptionId(): Returns subscription ID.