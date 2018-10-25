pragma solidity ^0.4.23;

/**
 * AIWar Game base contract
 */
contract Game {
    enum GameOverReason {
        NOT_OVER,
        HAS_WINNER,
        HAS_VIOLATOR,
        TIED
    }

    string public name;
    string public version;

    bytes public initialData;
    uint public minimalNumberOfPlayers;
    uint public defaultNumberOfPlayers;
    uint public maximumNumberOfPlayers;

    function decodeGameViolationReason(uint gameViolationReason) public view returns (string reason);

    /**
     * Sync game moves and returns new game data
     *
     * @param data - current game data
     * @param moves - array of moves indexed by turn index
     * @param fromTurn - sync moves from the turn
     * @param untilTurn - sync moves until this turn (exclusive)
     *
     * @return newData - new game data
     */
    function syncGameData(
        uint8 nSides,
        bytes data, uint16[] moves,
        uint fromTurn, uint untilTurn) external view returns (
            bytes newData,
            uint syncedTurn,
            uint gameOverReason,
            uint causingSide,
            uint gameViolationReason);

    function decodeGameOverReason(uint gameOverReason) public pure returns (string reason) {
        if (gameOverReason == uint(GameOverReason.NOT_OVER)) {
            reason = "Game not over yet";
        } else if (gameOverReason == uint(GameOverReason.HAS_WINNER)) {
            reason = "Game has a winner";
        } else if (gameOverReason == uint(GameOverReason.HAS_VIOLATOR)) {
            reason = "Game has a rule violator";
        } else if (gameOverReason == uint(GameOverReason.HAS_WINNER)) {
            reason = "Game has tied";
        } else {
            reason = "Unknown reason";
        }
    }

    function decodeMove(uint16 move) internal pure returns (uint8 side, uint16 moveData) {
        side = (uint8)(move >> 12);
        moveData = move & 0xFFF;
    }
}
