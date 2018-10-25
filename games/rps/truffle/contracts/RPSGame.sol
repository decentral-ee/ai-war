pragma solidity ^0.4.23;

import '../../../../core/contracts/Game.sol';

contract RPSGame is Game {
    enum GameViolationReasons {
        NO_VIOLATION,
        ALREADY_PLAYED,
        INVALID_MOVE_WRONG_DATA
    }
    uint public constant GAME_DATA_LENGTH = 0;

    enum Move { Null, Rock, Paper, Scissor }

    constructor() public {
        name = "R-P-S";
        version = "0.0.1";
        initialData = new bytes(GAME_DATA_LENGTH);
        minimalNumberOfPlayers = defaultNumberOfPlayers = maximumNumberOfPlayers = 2;
    }

    function decodeGameViolationReason(uint gameViolationReason) public view returns (string reason) {
        if (uint(GameViolationReasons.ALREADY_PLAYED) == gameViolationReason) {
            reason = "Already played";
        } else if (uint(GameViolationReasons.INVALID_MOVE_WRONG_DATA) == gameViolationReason) {
            reason = "Invalid move: wrong data";
        } else {
            reason = "Unknown reason";
        }
    }

    function syncGameData(
        uint8 nSides,
        bytes /*data*/, uint16[] moves,
        uint fromTurn, uint untilTurn) external view returns (
            bytes /*newData*/,
            uint syncedTurns,
            uint gameOverReason,
            uint causingSide,
            uint gameViolationReason) {
        uint16[] memory moveMaps;
        uint8 nPlayed;
        (gameViolationReason, causingSide, moveMaps, nPlayed) = createMoveMaps(nSides, moves, fromTurn, untilTurn);
        if (gameViolationReason > 0) {
            gameOverReason = uint(GameOverReason.HAS_VIOLATOR);
            syncedTurns = untilTurn;
            return;
        }
        // has all players played?
        if (nPlayed != nSides) {
            return;
        }
        (gameOverReason, causingSide) = calculateScores(nSides, moveMaps);
        syncedTurns = untilTurn;
    }

    function createMoveMaps(
        uint8 nSides,
        uint16[] moves,
        uint fromTurn, uint untilTurn
        ) private pure returns (
            uint gameViolationReason,
            uint causingSide,
            uint16[] memory moveMaps,
            uint8 nPlayed) {
        moveMaps = new uint16[](nSides);
        for (uint i = fromTurn; i < untilTurn; ++i) {
            (uint8 side, uint16 moveData) = decodeMove(moves[i]);
            // check violators
            if (moveData != uint16(Move.Rock) &&
                moveData != uint16(Move.Paper) &&
                moveData != uint16(Move.Scissor)) {
                gameViolationReason = uint(GameViolationReasons.INVALID_MOVE_WRONG_DATA);
            } else if (moveMaps[side - 1] != 0) {
                gameViolationReason = uint(GameViolationReasons.ALREADY_PLAYED);
            }
            if (gameViolationReason == 0) {
                moveMaps[side - 1] = moveData;
                ++nPlayed;
            } else {
                causingSide = side;
                break;
            }
        }
    }

    function calculateScores(
        uint8 nSides, uint16[] moveMaps) private pure returns (
            uint gameOverReason,
            uint causingSide) {
        uint8 maxScore;
        uint8[] memory scores = new uint8[](nSides);
        for (uint8 a = 1; a <= nSides; ++a) {
            if (moveMaps[a - 1] == 0) continue;
            for (uint8 b = 1; b <= nSides; ++b) {
                if (a == b) continue;
                if (moveMaps[b - 1] == 0) continue;
                int result = compareMove(moveMaps[a - 1], moveMaps[b - 1]);
                uint8 winningSide;
                if (result == 1) {
                    winningSide = a;
                } else if (result == -1) {
                    winningSide = b;
                } else {
                    continue;
                }
                scores[winningSide - 1]++;
                if (scores[winningSide - 1] > maxScore) {
                    maxScore = scores[winningSide - 1];
                    gameOverReason = uint(GameOverReason.HAS_WINNER);
                    causingSide = winningSide;
                } else if (scores[winningSide - 1] == maxScore) {
                    gameOverReason = uint(GameOverReason.NOT_OVER);
                    causingSide = 0;
                }
            }
        }
    }

    function compareMove(uint16 moveA, uint16 moveB) private pure returns (int result) {
        // result: 0 ties, 1: a wins, -1: b wins
        if (moveA == uint16(Move.Rock)) {
            if (moveB == uint16(Move.Paper)) {
                result = -1;
            } else if (moveB == uint16(Move.Scissor)) {
                result = 1;
            }
        } else if (moveA == uint16(Move.Paper)) {
            if (moveB == uint16(Move.Rock)) {
                result = 1;
            } else if (moveB == uint16(Move.Scissor)) {
                result = -1;
            }
        } else if (moveA == uint16(Move.Scissor)) {
            if (moveB == uint16(Move.Rock)) {
                result = -1;
            } else if (moveB == uint16(Move.Paper)) {
                result = 1;
            }
        }
    }
}
