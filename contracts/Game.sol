pragma solidity ^0.4.23;

contract Game {
    enum GameOverReason {
        NOT_OVER,
        HAS_WINNER,
        TIED
    }

    bytes public initialData;

    function decodeGameOverReason(uint gameOverReason) public view returns (string reason);

    function syncGameData(
        bytes data, uint16[] moves,
        uint fromTurn, uint toTurn) external view returns (
            bytes newData,
            uint syncedTurn,
            uint gameOverReason,
            uint8 causingSide);

    function decodeGameOverReasonBase(uint gameOverReason) internal pure returns (string reason) {
               if (gameOverReason == uint(GameOverReason.NOT_OVER)) {
            reason = "Game not over yet";
        } else if (gameOverReason == uint(GameOverReason.HAS_WINNER)) {
            reason = "Game has already a winner";
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
