pragma solidity ^0.4.23;

import '../../../../core/contracts/Game.sol';

contract TicTacToeGame is Game {
    enum GameViolationReasons {
        NO_VIOLATION,
        INVALID_MOVE_DATA_WRONG_SIDE_NUMBER,
        INVALID_MOVE_DATA_WRONG_CORDINATES,
        INVALID_MOVE_WRONG_TURN,
        INVALID_MOVE_CELL_ALREADY_TAKEN
    }

    // Game data layout:
    // - bits[0:18] for board data,
    // - x cordinate: left 0 -> right 2
    // - y cordinate: top 0 -> bottom 2
    // - cell data: bits[y * 6 + x * 2].2bits
    //   - 0 for empty, 1 for black side, 2 for white side
    // - causingSide: bits[18:19]
    // - reason - bits[20:23]
    //
    uint public constant GAME_DATA_LENGTH = 3;

    constructor() public {
        name = "TicTacToe";
        version = "0.0.1";
        initialData = new bytes(GAME_DATA_LENGTH);
        minimalNumberOfPlayers = defaultNumberOfPlayers = maximumNumberOfPlayers = 2;
    }

    function syncGameData(
        uint8 /* nSides */,
        bytes data, uint16[] moves,
        uint fromTurn, uint untilTurn)
        external view returns (
            bytes memory newData,
            uint syncedTurns,
            uint gameOverReason,
            uint causingSide,
            uint gameViolationReason) {
        uint i;
        require(data.length == GAME_DATA_LENGTH, "Wrong game data length");
        // copy data
        newData = new bytes(GAME_DATA_LENGTH);
        for (i = 0; i < GAME_DATA_LENGTH; ++i) {
            newData[i] = data[i];
        }
        // trvial cases
        syncedTurns = fromTurn;
        causingSide = uint8((data[2] >> 2) & 0x3);
        gameOverReason = uint(data[2] >> 4);
        if (gameOverReason > 0) {
            return;
        }
        // make moves
        for (i = fromTurn; i < untilTurn; ++i) {
            (uint causingSide_, uint gameOverReason_, uint gameViolationReason_) = makeMove(newData, i, moves[i]);
            if (gameOverReason_ > 0) {
                syncedTurns = i + 1;
                causingSide = causingSide_;
                gameOverReason = gameOverReason_;
                gameViolationReason = gameViolationReason_;
                return;
            }
        }
        syncedTurns = untilTurn;
    }

    function decodeGameViolationReason(uint gameViolationReason) public view returns (string reason){
       if (gameViolationReason == uint(GameViolationReasons.INVALID_MOVE_DATA_WRONG_SIDE_NUMBER)) {
            reason = "Invalid move data: wrong side number";
        } else if (gameViolationReason == uint(GameViolationReasons.INVALID_MOVE_DATA_WRONG_CORDINATES)) {
            reason = "Invalid move data: invalid coordinates";
        } else if (gameViolationReason == uint(GameViolationReasons.INVALID_MOVE_WRONG_TURN)) {
            reason = "Invalid move: wrong turn";
        } else if (gameViolationReason == uint(GameViolationReasons.INVALID_MOVE_CELL_ALREADY_TAKEN)) {
        reason = "Invalid move: cell is already taken";
        } else {
            reason = "Unknown reason";
        }
    }

    function makeMove(bytes memory data, uint currentTurn, uint16 move) private pure returns (
            uint causingSide,
            uint gameOverReason,
            uint gameViolationReason
        ) {
        (uint8 side, uint16 x, uint16 y, uint invalidMoveReason) = decodeTicTacToeMove(move);
        (uint xx, uint yy) = toXXYY(x, y);
        if (invalidMoveReason > 0) {
            gameViolationReason = invalidMoveReason;
        } else if (((currentTurn % 2) == 0 ? 1 : 2) != side) {
            gameViolationReason = uint(GameViolationReasons.INVALID_MOVE_WRONG_TURN);
        } else if (data[yy] & byte(3 << (xx*2)) > 0) {
            gameViolationReason = uint(GameViolationReasons.INVALID_MOVE_CELL_ALREADY_TAKEN);
        }
        if (gameViolationReason > 0) {
            gameOverReason = uint(GameOverReason.HAS_VIOLATOR);
            causingSide = side;
            data[2] |= byte(causingSide << 2 | gameOverReason << 4);
            return;
        }
        data[yy] |= (byte)(side << (xx*2));
        if (detectWin(data, side)) {
            causingSide = side;
            gameOverReason = uint(GameOverReason.HAS_WINNER);
        } else if (currentTurn >= 16) {
            causingSide = side;
            gameOverReason = uint(GameOverReason.TIED);
        }
    }

    function detectWin(bytes memory data, uint8 side) private pure returns (bool) {
        if (side == 1) {
            return (
                // horizontal
                (data[0] & 21 == 21) ||
                (data[0] & 64 == 64 && data[1] & 5 == 5) ||
                (data[1] & 80 == 80 && data[2] & 1 == 1) ||
                // vertical
                (data[0] & 65 == 65 && data[1] & 16 == 16) ||
                (data[0] & 4 == 4 && data[1] & 65 == 65) ||
                (data[0] & 16 == 16 && data[1] & 4 == 4 && data[2] & 1 == 1) ||
                // diagno
                (data[0] & 1 == 1 && data[1] & 1 == 1 && data[2] & 1 == 1) ||
                (data[0] & 16 == 16 && data[1] & 17 == 17)
            );
        } else if (side == 2) {
            return (
                // horizontal
                (data[0] & 42 == 42) ||
                (data[0] & 128 == 128 && data[1] & 10 == 10) ||
                (data[1] & 160 == 160 && data[2] & 2 == 2) ||
                // vertical
                (data[0] & 130 == 130 && data[1] & 32 == 32) ||
                (data[0] & 8 == 8 && data[1] & 130 == 130) ||
                (data[0] & 32 == 32 && data[1] & 8 == 8 && data[2] & 2 == 2) ||
                // diagno
                (data[0] & 2 == 2 && data[1] & 2 == 2 && data[2] & 2 == 2) ||
                (data[0] & 32 == 32 && data[1] & 34 == 34)
            );
        }
    }

    function decodeTicTacToeMove(uint16 move) private pure returns (
        uint8 side,
        uint16 x,
        uint16 y,
        uint invalidMoveReason) {
        invalidMoveReason = uint(GameViolationReasons.NO_VIOLATION);
        (uint8 side_, uint16 moveData) = decodeMove(move);
        side = side_;
        if (side != 1 && side != 2) {
            invalidMoveReason = uint(GameViolationReasons.INVALID_MOVE_DATA_WRONG_SIDE_NUMBER);
            return;
        }
        x = moveData & 3;
        y = (moveData & 12) >> 2;
        if (moveData > 15 || x >= 3 || y >= 3) {
            invalidMoveReason = uint(GameViolationReasons.INVALID_MOVE_DATA_WRONG_CORDINATES);
            return;
        }
    }

    function toXXYY(uint16 x, uint16 y) private pure returns (uint xx, uint yy) {
        yy = (y*3+x)/4;
        xx = (y*3+x)%4;
    }
}
