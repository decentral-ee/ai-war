pragma solidity ^0.4.23;

import '../contracts/Game.sol';

contract RiggedGame is Game {
    enum GameViolationReasons {
        NO_VIOLATION,
        VIOLATION_RIGGED
    }

    uint private riggedGameOverReason;
    uint private riggedCausingSide;
    uint private riggedGameViolationReason;

    constructor() public {
        name = "RiggedGame";
        version = "0.0.1";
        initialData = new bytes(0);
        minimalNumberOfPlayers = 2;
        defaultNumberOfPlayers = 2;
        maximumNumberOfPlayers = 99;
    }

    function rig(
        uint gameOverReason,
        uint causingSide,
        uint gameViolationReason) public {
        riggedGameOverReason = gameOverReason;
        riggedCausingSide = causingSide;
        riggedGameViolationReason = gameViolationReason;
    }

    function decodeGameViolationReason(uint gameOverReason) public view returns (string reason) {
        if (gameOverReason == uint(GameViolationReasons.VIOLATION_RIGGED)) {
            reason = "Game violation: rigged";
        } else {
            reason = "Invalid move: unknown reason";
        }
    }

    function syncGameData(
        bytes /*data*/, uint16[] /*moves*/,
        uint previousTurn, uint /*toTurn*/) external view returns (
            bytes /*newData*/,
            uint syncedTurn,
            uint gameOverReason,
            uint causingSide,
            uint gameViolationReason) {
        syncedTurn = previousTurn + 1;
        gameOverReason = riggedGameOverReason;
        causingSide = riggedCausingSide;
        gameViolationReason = riggedGameViolationReason;
    }

}
