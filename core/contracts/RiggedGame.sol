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

    function decodeGameViolationReason(uint gameViolationReason) public view returns (string reason) {
        if (gameViolationReason == uint(GameViolationReasons.VIOLATION_RIGGED)) {
            reason = "Game violation: rigged";
        } else {
            reason = "Unknown reason";
        }
    }

    function syncGameData(
        uint8 /* nSides */,
        bytes /*data*/, uint16[] /*moves*/,
        uint /* fromTurn */, uint untilTurn) external view returns (
            bytes /*newData*/,
            uint syncedTurns,
            uint gameOverReason,
            uint causingSide,
            uint gameViolationReason) {
        syncedTurns = untilTurn;
        gameOverReason = riggedGameOverReason;
        causingSide = riggedCausingSide;
        gameViolationReason = riggedGameViolationReason;
    }

}
