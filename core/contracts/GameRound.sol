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
        uint8 nSides;
        mapping(uint => PlayerData) players;
        uint joinedPlayers;

        /**
         * Move data layout:
         * bits[0:11] - game specific move data
         * bits[12:15] - side
         */
        uint16[] moves;

        /**
         * Secret move hashes
         *
         * turn -> secret move
         */
        mapping (uint => bytes32) secretMoveHashes;

        //
        // Game data syncs
        //
        uint syncedTurns;

        bytes gameData;

        uint gameOverReason;

        uint causingSide;

        uint gameViolationReason;
    }

    function getMove(GameRoundData storage self, uint turn) external view returns (uint8 side, uint16 data) {
        require(turn < self.moves.length, "No such turn data");
        bytes32 secretMove = self.secretMoveHashes[turn];
        require(secretMove == bytes32(0), "It is still a secret move");
        uint16 move = self.moves[turn];
        side = (uint8)(move >> 12);
        data = move & 0xFFF;
    }

    function create(
        GameRoundData storage self,
        GameRoundCallback cb,
        GameEvent gameEvent,
        Game game,
        uint8 nSides) external {
        self.cb = cb;
        self.gameEvent = gameEvent;
        self.game = game;
        self.state = State.Preparing;

        self.nSides = nSides;
        require(self.nSides >= game.minimalNumberOfPlayers()
            && self.nSides <= game.maximumNumberOfPlayers(),
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
        require(side <= self.nSides, "Expecting less players");
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
        require(side <= self.nSides, "Expecting less players");
        address invitedPlayer = self.invitations[side];
        address player = msg.sender;
        if (invitedPlayer == address(0)) {
            require(self.state == State.Ready, "Not yet for accepting open invitations");
        } else {
            require(player == invitedPlayer, "Not authorized player");
        }
        PlayerData storage playerData = self.players[side];
        require(playerData.player == 0, "Player has already been set");

        if (self.gameEvent != address(0)) {
            uint grantedAllowance = self.gameEvent.getGrantedAllowance(this, player);
            require(grantedAllowance >= maximumBetSize, "Not enough allowance granted");
            require(self.gameEvent.lockBalance(player, maximumBetSize), "Balance lock failed");
        }

        playerData.player = player;
        playerData.maximumBetSize = maximumBetSize;
        playerData.currentBetSize = currentBetSize;
        playerData.allowTakeOver = false;
        playerData.takeOverFee = 0;

        ++self.joinedPlayers;
        if (self.joinedPlayers == self.nSides) {
            self.state = State.InProgress;
            if (self.cb != address(0)) {
                self.cb.gameRoundStarted(self.gameEvent, self.game, this);
            }
            emit AIWar_GameRound_Started(self.gameEvent, self.game);
        }
    }

    function makeMove(
        GameRoundData storage self,
        uint side, uint16 moveData,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        require(self.state == State.InProgress, "Game is not in progress");
        PlayerData storage playerData = self.players[side];
        require(playerData.player != address(0), "Invalid side");
        require(playerData.player == msg.sender, "Unauthorized player");
        validateNewBets(
            playerData,
            maximumBetSize,
            currentBetSize,
            allowTakeOver,
            takeOverFee);
        // create the move
        self.moves.push((uint16(side) << 12) | (moveData & 0xFFF));
    }

    function makeSecretMove(
        GameRoundData storage self,
        uint side, bytes32 moveHash,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        uint turn = self.moves.length;
        require(self.state == State.InProgress, "Game is not in progress");
        PlayerData storage playerData = self.players[side];
        require(playerData.player != address(0), "Invalid side");
        require(playerData.player == msg.sender, "Unauthorized player");
        validateNewBets(
            playerData,
            maximumBetSize,
            currentBetSize,
            allowTakeOver,
            takeOverFee);
        self.moves.push((uint16(side) << 12) | 0);
        self.secretMoveHashes[turn] = moveHash;
    }

    function revealSecretMove(
        GameRoundData storage self,
        uint turn,
        uint16 moveData, uint256 salt) external {
        require(turn < self.moves.length, "No such turn data");
        bytes32 secretMoveHash = self.secretMoveHashes[turn];
        require(secretMoveHash != 0, "There is no secret move for that turn");
        uint16 move = self.moves[turn];
        uint8 side = (uint8)(move >> 12);
        PlayerData memory playerData = self.players[side];
        require(playerData.player == msg.sender, "Unauthorized player");
        bytes32 secretMoveHash2 = keccak256(abi.encodePacked(moveData, salt));
        require(secretMoveHash2 == secretMoveHash, "Secret move hashes do not match");
        self.moves[turn] = (uint16(side) << 12) | moveData;
        delete self.secretMoveHashes[turn];
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

    function syncGameData(GameRoundData storage self, uint untilTurn) external {
        require(untilTurn >= self.syncedTurns, "Already synced to the specified turn");
        require(untilTurn <= self.moves.length, "Not enough move data to sync");

        uint i;

        // check if there is any secret moves
        for (i = self.syncedTurns; i < untilTurn; ++i) {
            require(self.secretMoveHashes[i] == bytes32(0),
                "Some secret move not revealed yet");
        }

        (bytes memory newData,
        uint syncedTurns,
        uint gameOverReason,
        uint causingSide,
        uint gameViolationReason) = self.game.syncGameData(
            self.nSides,
            self.gameData, self.moves,
            self.syncedTurns, untilTurn);

        if (self.syncedTurns != syncedTurns) {
            self.syncedTurns = syncedTurns;

            // update game data
            uint newDataLength = newData.length;
            for (i = 0; i < newDataLength; ++i) {
                if (newData[i] != self.gameData[i]) {
                    self.gameData[i] = newData[i];
                }
            }

            // update game states
            if (self.gameOverReason != gameOverReason) {
                self.gameOverReason = gameOverReason;
                self.causingSide = causingSide;
                self.gameViolationReason = gameViolationReason;
                self.state = State.Ended;
                if (self.cb != address(0)) {
                    self.cb.gameRoundEnded(self.gameEvent, self.game, this);
                }
                emit AIWar_GameRound_Ended(self.gameEvent, self.game);
            }
        }
    }

    function settlePayout(GameRoundData storage self) external {
        require(self.state == State.Ended, "Game has not ended yet");
        if (self.gameEvent == address(0)) return;

        address winner;
        address loser;
        if (self.gameOverReason == uint(Game.GameOverReason.HAS_WINNER)) {
            winner = self.players[self.causingSide].player;
            loser = self.players[self.causingSide == 1 ? 2 : 1].player;
        } else if (self.gameOverReason == uint(Game.GameOverReason.HAS_VIOLATOR)) {
            loser = self.players[self.causingSide].player;
            winner = self.players[self.causingSide == 1 ? 2 : 1].player;
        } // else tied
        if (winner != address(0)) {
            uint lostAmount = self.gameEvent.getLockedBalance(this, loser);
            self.gameEvent.transferLockedBalance(loser, winner, lostAmount);
        }

        // unlock all balances when game ends
        self.gameEvent.unlockAllBalance(self.players[1].player);
        self.gameEvent.unlockAllBalance(self.players[2].player);
    }

    function validateNewBets(
        PlayerData playerData,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) private pure {
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
    }
}

contract GameRound is Owned {
    using GameRoundLib for GameRoundLib.GameRoundData;

    GameRoundLib.GameRoundData private self;

    function getGameEvent() external view returns (GameEvent) { return self.gameEvent; }
    function getGame() external view returns (Game) { return self.game; }
    function getState() external view returns (GameRoundLib.State) { return self.state; }
    function getNumberOfPlayers() external view returns (uint8) { return self.nSides; }
    function getPlayer(uint side) external view returns (address) { return self.players[side].player; }
    function getNumberOfMoves() external view returns (uint) { return self.moves.length; }
    function getMove(uint turn) external view returns (uint8 side, uint16 data) {
        (side, data) = GameRoundLib.getMove(self, turn);
    }
    function getSyncedTurns() external view returns (uint) { return self.syncedTurns; }
    function getGameData() external view returns (bytes) { return self.gameData; }
    function getGameOverReason() external view returns (uint) { return self.gameOverReason; }
    function getCausingSide() external view returns (uint) { return self.causingSide; }
    function getGameViolationReason() external view returns (uint) { return self.gameViolationReason; }

    //
    // Configuration functions, only used by creator
    //
    constructor(
        GameRoundCallback cb,
        GameEvent gameEvent,
        Game game,
        uint8 nSides) public {
        self.create(cb, gameEvent, game, nSides);
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
        uint side, uint16 moveData,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        self.makeMove(
            side, moveData,
            maximumBetSize,
            currentBetSize,
            allowTakeOver,
            takeOverFee);
    }

    function makeSecretMove(
        uint side, bytes32 moveHash,
        uint maximumBetSize,
        uint currentBetSize,
        bool allowTakeOver,
        uint takeOverFee) external {
        self.makeSecretMove(
            side, moveHash,
            maximumBetSize,
            currentBetSize,
            allowTakeOver,
            takeOverFee);
    }

    function revealSecretMove(
        uint turn,
        uint16 moveData, uint256 salt) external {
        self.revealSecretMove(
            turn,
            moveData, salt);
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

    /**
     * Sync game data
     *
     * @param untilTurn - sync moves until this turn (exclusive)
     */
    function syncGameData(uint untilTurn) external {
        self.syncGameData(untilTurn);
    }

    function settlePayout() external {
        self.settlePayout();
    }
}
