pragma solidity ^0.4.23;

import '../../../../core/contracts/Game.sol';

contract RPSGame is Game {
    uint public constant GAME_DATA_LENGTH = 4;

    constructor() public {
        name = "R-P-S";
        version = "0.0.1";
        initialData = new bytes(GAME_DATA_LENGTH);
        minimalNumberOfPlayers = defaultNumberOfPlayers = maximumNumberOfPlayers = 2;
    }

    function decodeGameViolationReason(uint gameOverReason) public view returns (string reason) {
        reason = "Invalid move: unknown reason";
    }

    function syncGameData(
        bytes data, uint16[] moves,
        uint fromTurn, uint toTurn) external view returns (
            bytes newData,
            uint syncedTurn,
            uint gameOverReason,
            uint causingSide,
            uint gameViolationReason) {
    }
}
