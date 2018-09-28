pragma solidity ^0.4.23;

import './base/Owned.sol';
import './GameEvent.sol';
import './Game.sol';


contract GameRoundCallback {
    function gameRoundStarted(address gameEvent, address game, address gameRound) external;
    function gameRoundEnded(address gameEvent, address game, address gameRound) external;
}

library GameRoundLib {
    enum State {
        Preparing,
        Ready,
        InProgress,
        Ended
    }

    struct PlayerData {
        address player;
        uint maximumBetSize;
        uint currentBetSize;
        bool allowTakeOver;
        uint takeOverFee;
    }

    struct GameRoundData {
        GameRoundCallback cb;
        GameEvent gameEvent;
        Game game;

        State state;

        mapping(uint => address) invitations;
        uint expectedNumberOfPlayers;
        mapping(uint => PlayerData) players;
        uint joinedPlayers;

        /**
         * Move data layout:
         * bits[0:11] - game specific move data
         * bits[12:15] - side
         */
        uint16[] moves;

        //
        // Game data syncs
        //
        uint syncedTurn;

        bytes gameData;

        uint gameOverReason;

        uint causingSide;
    }

    function getMove(GameRoundData storage self, uint turn) external view returns (uint8 side, uint16 data) {
        require(turn < self.moves.length, "No such turn data");
        uint16 move = self.moves[turn];
        side = (uint8)(move >> 12);
        data = move & 0xFFF;
    }

    function create(
        GameRoundData storage self,
        GameRoundCallback cb,
        GameEvent gameEvent,
        Game game,
        uint expectedNumberOfPlayers) external {
        self.cb = cb;
        self.gameEvent = gameEvent;
        self.game = game;
        self.state = State.Preparing;

        self.expectedNumberOfPlayers = expectedNumberOfPlayers;
        require(self.expectedNumberOfPlayers >= game.minimalNumberOfPlayers()
            && self.expectedNumberOfPlayers <= game.maximumNumberOfPlayers(),
            "Invalid number of players expected");

        uint initialDataLength = game.initialData().length;
        self.gameData = new bytes(initialDataLength);
        for (uint i = 0; i < initialDataLength; i++) {
            self.gameData[i] = game.initialData()[i];
        }

        emit AIWar_GameRound_Created(gameEvent, game);
    }

    event AIWar_GameRound_Created(address indexed gameEvent, address indexed game);

    event AIWar_GameRound_Ready(address indexed gameEvent, address indexed game);

    event AIWar_GameRound_Started(address indexed gameEvent, address indexed game);

    event AIWar_GameRound_Ended(address indexed gameEvent, address indexed game);

    function invitePlayer(
        GameRoundData storage self,
        uint side,
        address player) external {
        require(self.state == State.Preparing, "Game has already been configured");
        require(self.invitations[side] == address(0), "Player has already been invited");
        require(side <= self.expectedNumberOfPlayers, "Expecting less players");
        self.invitations[side] = player;
    }

    function ready(GameRoundData storage self) external {
        require(self.state == State.Preparing, "Game has already been configured");
        self.state = State.Ready;
        emit AIWar_GameRound_Ready(self.gameEvent, self.game);
    }

    function acceptInvitation(
        GameRoundData storage self,
        uint side,
        uint maximumBetSize,
        uint currentBetSize) external {
        require(side > 0, "Side has to be greater than 0");
        require((self.state == State.Ready) || (self.state == State.Preparing), "Game has started");
        require(side <= self.expectedNumberOfPlayers, "Expecting less players");
        address invitedPlayer = self.invitations[side];
        address player = msg.sender;
        if (invitedPlayer == address(0)) {
            require(self.state == State.Ready, "Not yet for accepting open invitations");
        } else {
            require(player == invitedPlayer, "Not authorized player");
        }
        PlayerData storage playerData = self.players[side];
        require(playerData.player == 0, "Player has already been set");
        uint grantedAllowance = self.gameEvent.getGrantedAllowance(this, player);
        require(grantedAllowance >= maximumBetSize, "Not enough allowance granted");
        require(self.gameEvent.lockBalance(player, maximumBetSize), "Balance lock failed");
        playerData.player = player;
        playerData.maximumBetSize = maximumBetSize;
        playerData.currentBetSize = currentBetSize;
        playerData.allowTakeOver = false;
        playerData.takeOverFee = 0;

        ++self.joinedPlayers;
        if (self.joinedPlayers == self.expectedNumberOfPlayers) {
            self.state = State.InProgress;
            self.cb.gameRoundStarted(self.gameEvent, self.game, this);
            emit AIWar_GameRound_Started(self.gameEvent, self.game);
        }
    }

    function makeMove(
        GameRoundData storage self,
        uint side, uint16 data,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        require(self.state == State.InProgress, "Game is not in progress");
        PlayerData storage playerData = self.players[side];
        require(playerData.player != address(0), "Invalid side");
        require(playerData.player == msg.sender, "Unauthorized player");
        // validate betting parameters
        if (playerData.maximumBetSize != maximumBetSize) {
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
        self.moves.push((uint16(side) << 12) | (data & 0xFFF));
    }

    function takeOver(
        GameRoundData storage self,
        uint side,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        require(side > 0, "Side has to be greater than 0");
        require(self.state == State.InProgress, "Game is not in progress");
        require(maximumBetSize >= currentBetSize, "maximumBetSize should not be smaller than currentBetSize");
        PlayerData storage playerData = self.players[side];

        // FIXME
        // validate take over conditions
        // require(gameEvent.validatePlayer(msg.sender, maximumBetSize), "player cannot be validated");

        playerData.player = msg.sender;
        playerData.maximumBetSize = maximumBetSize;
        playerData.currentBetSize = currentBetSize;
        playerData.allowTakeOver = allowTakeOver;
        playerData.takeOverFee = takeOverFee;
    }

    function syncGameData(GameRoundData storage self, uint16 untilTurn) external {
        require(untilTurn > self.syncedTurn, "Already synced to the specified turn");
        require(untilTurn <= self.moves.length, "Not enough move data to sync");
        (bytes memory newData,
        uint syncedTurn,
        uint gameOverReason,
        uint causingSide) = self.game.syncGameData(
            self.gameData, self.moves,
            self.syncedTurn, untilTurn);
        uint dataLength = self.gameData.length;
        for (uint i = 0; i < dataLength; ++i) {
            if (newData[i] != self.gameData[i]) {
                self.gameData[i] = newData[i];
            }
        }
        if (self.syncedTurn != syncedTurn) {
            self.syncedTurn = syncedTurn;
            if (self.gameOverReason != gameOverReason) {
                self.gameOverReason = gameOverReason;
                self.causingSide = causingSide;
                self.state = State.Ended;
                self.cb.gameRoundEnded(self.gameEvent, self.game, this);
                emit AIWar_GameRound_Ended(self.gameEvent, self.game);
            }
        }
    }

    function settlePayout(GameRoundData storage self) external {
        require(self.state == State.Ended, "Game has not ended yet");
        if (self.gameOverReason == uint(Game.GameOverReason.HAS_WINNER)) {
            address winner = self.players[self.causingSide].player;
            address loser = self.players[self.causingSide == 1 ? 2 : 1].player;
            uint lostAmount = self.gameEvent.getLockedBalance(this, loser);
            self.gameEvent.transferLockedBalance(loser, winner, lostAmount);
        }
        self.gameEvent.unlockAllBalance(self.players[1].player);
        self.gameEvent.unlockAllBalance(self.players[2].player);
    }
}

contract GameRound is Owned {
    using GameRoundLib for GameRoundLib.GameRoundData;

    GameRoundLib.GameRoundData private self;

    function getGameEvent() external view returns (GameEvent) { return self.gameEvent; }
    function getGame() external view returns (Game) { return self.game; }
    function getState() external view returns (GameRoundLib.State) { return self.state; }
    function getPlayer(uint side) external view returns (address) { return self.players[side].player; }
    function getNumberOfMoves() external view returns (uint) { return self.moves.length; }
    function getMove(uint turn) external view returns (uint8 side, uint16 data) {
        (side, data) = GameRoundLib.getMove(self, turn);
    }
    function getSyncedTurn() external view returns (uint) { return self.syncedTurn; }
    function getGameData() external view returns (bytes) { return self.gameData; }
    function getGameOverReason() external view returns (uint) { return self.gameOverReason; }
    function getCausingSide() external view returns (uint) { return self.causingSide; }

    //
    // Configuration functions, only used by creator
    //
    constructor(
        GameRoundCallback cb,
        GameEvent gameEvent,
        Game game,
        uint expectedNumberOfPlayers) public {
        self.create(cb, gameEvent, game, expectedNumberOfPlayers);
    }

    function invitePlayer(
        uint side,
        address player) external onlyOwner {
        self.invitePlayer(side, player);
    }

    function ready() external onlyOwner {
        self.ready();
    }

    function acceptInvitation(
        uint side,
        uint maximumBetSize,
        uint currentBetSize) external {
        self.acceptInvitation(side, maximumBetSize, currentBetSize);
    }

    function selfInviteAndReady(
        uint creatorSide,
        uint creatorMaximumBetSize,
        uint creatorCurrentBetSize) external onlyOwner {
        self.invitePlayer(creatorSide, msg.sender);
        self.acceptInvitation(creatorSide, creatorMaximumBetSize, creatorCurrentBetSize);
        self.ready();
    }

    function makeMove(
        uint side, uint16 data,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        self.makeMove(
            side, data,
            maximumBetSize,
            currentBetSize,
            allowTakeOver,
            takeOverFee);
    }

    function takeOver(
        uint side,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        self.takeOver(
            side,
            maximumBetSize,
            currentBetSize,
            allowTakeOver,
            takeOverFee);
    }

    /*function reportIllegalMove() public {
        //
    }*/

    function syncGameData(uint16 untilTurn) external {
        self.syncGameData(untilTurn);
    }

    function settlePayout() external {
        self.settlePayout();
    }
}
