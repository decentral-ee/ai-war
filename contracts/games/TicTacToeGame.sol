pragma solidity ^0.4.23;

import '../Game.sol';

contract TicTacToeGame is Game {
    enum GameOverReasonExt {
        NOT_OVER,
        HAS_WINNER,
        TIED,
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
        initialData = new bytes(GAME_DATA_LENGTH);
    }

    /**
     * @param previousTurn - sync moves from the next turn to this
     * @param toTurn - sync moves until this turn (inclusive)
     */
    function syncGameData(
        bytes data, uint16[] moves,
        uint previousTurn, uint toTurn)
        external view returns (
            bytes memory newData,
            uint syncedTurn,
            uint gameOverReason,
            uint causingSide) {
        uint i;
        require(data.length == GAME_DATA_LENGTH, "Wrong game data length");
        // copy data
        newData = new bytes(GAME_DATA_LENGTH);
        for (i = 0; i < GAME_DATA_LENGTH; ++i) {
            newData[i] = data[i];
        }
        // trvial cases
        syncedTurn = previousTurn;
        causingSide = uint8((data[2] >> 2) & 0x3);
        gameOverReason = uint(data[2] >> 4);
        if (gameOverReason > 0) {
            return;
        }
        // make moves
        for (i = previousTurn; i < toTurn; ++i) {
            (uint causingSide_, uint gameOverReason_) = makeMove(newData, i, moves[i]);
            if (gameOverReason_ > 0) {
                syncedTurn = i + 1;
                causingSide = causingSide_;
                gameOverReason = gameOverReason_;
                return;
            }
        }
        syncedTurn = toTurn;
    }

    function decodeGameOverReason(uint gameOverReason) public view returns (string reason){
               if (gameOverReason == uint(GameOverReasonExt.INVALID_MOVE_DATA_WRONG_SIDE_NUMBER)) {
            reason = "Invalid move data: wrong side number";
        } else if (gameOverReason == uint(GameOverReasonExt.INVALID_MOVE_DATA_WRONG_CORDINATES)) {
            reason = "Invalid move data: invalid coordinates";
        } else if (gameOverReason == uint(GameOverReasonExt.INVALID_MOVE_WRONG_TURN)) {
            reason = "Invalid move: wrong turn";
        } else if (gameOverReason == uint(GameOverReasonExt.INVALID_MOVE_CELL_ALREADY_TAKEN)) {
            reason = "Invalid move: cell is already taken";
        } else {
            reason = decodeGameOverReasonBase(gameOverReason);
        }
    }

    function makeMove(bytes memory data, uint previousTurn, uint16 move) private pure returns (
            uint causingSide,
            uint gameOverReason
        ) {
        (uint8 side, uint16 x, uint16 y, uint invalidMoveReason) = decodeTicTacToeMove(move);
        (uint xx, uint yy) = toXXYY(x, y);
        if (invalidMoveReason > 0) {
            gameOverReason = invalidMoveReason;
        } else if (((previousTurn % 2) == 0 ? 1 : 2) != side) {
            gameOverReason = uint(GameOverReasonExt.INVALID_MOVE_WRONG_TURN);
        } else if (data[yy] & byte(3 << (xx*2)) > 0) {
            gameOverReason = uint(GameOverReasonExt.INVALID_MOVE_CELL_ALREADY_TAKEN);
        }
        if (gameOverReason > 0) {
            causingSide = side;
            data[2] |= byte(causingSide << 2 | gameOverReason << 4);
            return;
        }
        data[yy] |= (byte)(side << (xx*2));
        if (detectWin(data, side)) {
            causingSide = side;
            gameOverReason = uint(GameOverReasonExt.HAS_WINNER);
        } else if (previousTurn >= 16) {
            causingSide = side;
            gameOverReason = uint(GameOverReasonExt.TIED);
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
        invalidMoveReason = uint(GameOverReason.NOT_OVER);
        (uint8 side_, uint16 moveData) = decodeMove(move);
        side = side_;
        if (side != 1 && side != 2) {
            invalidMoveReason = uint(GameOverReasonExt.INVALID_MOVE_DATA_WRONG_SIDE_NUMBER);
            return;
        }
        x = moveData & 3;
        y = (moveData & 12) >> 2;
        if (moveData > 15 || x >= 3 || y >= 3) {
            invalidMoveReason = uint(GameOverReasonExt.INVALID_MOVE_DATA_WRONG_CORDINATES);
            return;
        }
    }

    function toXXYY(uint16 x, uint16 y) private pure returns (uint xx, uint yy) {
        yy = (y*3+x)/4;
        xx = (y*3+x)%4;
    }
}
