pragma solidity ^0.4.23;

import './base/Owned.sol';
import './GameEvent.sol';
import './Game.sol';

contract GameRound is Owned {
    GameEvent public gameEvent;
    Game public game;

    enum State {
        Preparing,
        InProgress,
        Ended
    }
    State public state;

    /**
     * @title Maximum size of bet any player could take
     * Any minus value means there is no maximum size of bets
     *
     * FIXME to be implemented
     */
    int public maximumBetSizeForAll;

    struct PlayerData {
        address player;
        uint maximumBetSize;
        uint currentBetSize;
        bool allowTakeOver;
        uint takeOverFee;
    }
    mapping(uint => PlayerData) public players;

    /**
     * Move data layout:
     * bits[0:11] - game specific move data
     * bits[12:15] - side
     */
    uint16[] public moves;

    //
    // Game data syncs
    //
    uint public syncedTurn;

    bytes public gameData;

    uint public gameOverReason;

    uint public causingSide;

    //
    // Configuration functions, only used by creator
    //
    constructor(
        GameEvent gameEvent_,
        Game game_,
        int maximumBetSizeForAll_) public {
        gameEvent = gameEvent_;
        game = game_;
        maximumBetSizeForAll = maximumBetSizeForAll_;
        state = State.Preparing;

        uint initialDataLength = game.initialData().length;
        gameData = new bytes(initialDataLength);
        for (uint i = 0; i < initialDataLength; i++) {
            gameData[i] = game.initialData()[i];
        }
    }

    function setPlayer(
        uint side,
        address player,
        uint maximumBetSize,
        uint currentBetSize) public {
        require(state == State.Preparing, "Game has already started");
        require(side > 0, "Side has to be greater than 0");
        PlayerData storage playerData = players[side];
        require(playerData.player == 0, "Player has already been set");
        uint grantedAllowance = gameEvent.getGrantedAllowance(player);
        require(grantedAllowance >= maximumBetSize, "Not enough allowance granted");
        require(gameEvent.lockBalance(player, maximumBetSize), "Balance lock failed");
        playerData.player = player;
        playerData.maximumBetSize = maximumBetSize;
        playerData.currentBetSize = currentBetSize;
        playerData.allowTakeOver = false;
        playerData.takeOverFee = 0;
    }

    function start() public onlyOwner {
        require(state == State.Preparing, "Game has already started");
        state = State.InProgress;
        emit AIWar_GameRound_Started(gameEvent, game, this);
    }

    function getMove(uint turn) public view returns (uint8 side, uint16 data) {
        require(state == State.InProgress, "Game is not in progress");
        require(turn < moves.length, "No such turn data");
        uint16 move = moves[turn];
        side = (uint8)(move >> 12);
        data = move & 0xFFF;
    }

    function makeMove(
        uint side, uint16 data,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) public {
        require(state == State.InProgress, "Game is not in progress");
        GameRound.PlayerData storage playerData = players[side];
        require(playerData.player != address(0), "Invalid side");
        require(playerData.player == msg.sender, "Unauthorized player");
        // validate betting parameters
        if (maximumBetSize != playerData.maximumBetSize) {
            playerData.maximumBetSize = maximumBetSize;
        }
        if (playerData.currentBetSize != currentBetSize) {
            playerData.currentBetSize = currentBetSize;
        }
        if (playerData.allowTakeOver != allowTakeOver) {
            playerData.allowTakeOver = allowTakeOver;
        }
        if (playerData.takeOverFee != takeOverFee) {
            playerData.takeOverFee = takeOverFee;
        }
        // create the move
        moves.push((uint16(side) << 12) | (data & 0xFFF));
    }

    function takeOver(
        uint side,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) public {
        require(side > 0, "Side has to be greater than 0");
        require(state == State.InProgress, "Game is not in progress");
        require(maximumBetSize >= currentBetSize, "maximumBetSize should not be smaller than currentBetSize");
        PlayerData storage playerData = players[side];

        // FIXME
        //require(gameEvent.validatePlayer(msg.sender, maximumBetSize), "player cannot be validated");

        playerData.player = msg.sender;
        playerData.maximumBetSize = maximumBetSize;
        playerData.currentBetSize = currentBetSize;
        playerData.allowTakeOver = allowTakeOver;
        playerData.takeOverFee = takeOverFee;
    }

    /*function reportIllegalMove() public {
        //
    }*/

    function syncGameData(uint16 untilTurn) public {
        require(untilTurn > syncedTurn, "Already synced to the specified turn");
        require(untilTurn <= moves.length, "Not enough move data to sync");
        (bytes memory newData,
        uint syncedTurn_,
        uint gameOverReason_,
        uint causingSide_) = game.syncGameData(
            gameData, moves,
            syncedTurn, untilTurn);
        uint dataLength = gameData.length;
        for (uint i = 0; i < dataLength; ++i) {
            if (newData[i] != gameData[i])
                gameData[i] = newData[i];
        }
        if (syncedTurn != syncedTurn_) {
            syncedTurn = syncedTurn_;
            if (gameOverReason != gameOverReason_) {
                gameOverReason = gameOverReason_;
                causingSide = causingSide_;
                state = State.Ended;
                emit AIWar_GameRound_Ended(gameEvent, game, this);
            }
        }
    }

    function settlePayout() external {
        require(state == State.Ended, "Game has not ended yet");
        if (gameOverReason == uint(Game.GameOverReason.HAS_WINNER)) {
            address winner = players[causingSide].player;
            address loser = players[causingSide == 1 ? 2 : 1].player;
            uint lostAmount = gameEvent.getLockedBalance(loser);
            gameEvent.transferLockedBalance(loser, winner, lostAmount);
        }
        gameEvent.unlockAllBalance(players[1].player);
        gameEvent.unlockAllBalance(players[2].player);
    }

    event AIWar_GameRound_Started(address indexed gameEvent, address indexed game, address round);
    event AIWar_GameRound_Ended(address indexed gameEvent, address indexed game, address round);
}
