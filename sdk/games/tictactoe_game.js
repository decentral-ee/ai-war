const SIDE_SYMBOLS = {0:'.',1:'x',2:'o'};

function createMoveData(x, y) {
    return (y << 2) | x;
}

function parseGameData(gameData) {
    let board = {};
    for (let y = 0; y < 3; ++y) {
        board[y] = {};
        for (let x = 0; x < 3; ++x) {
            let yy = Math.floor((y*3+x)/4);
            let xx = (y*3+x)%4;
            let b = gameData.slice(2 + yy * 2, 4 + yy * 2);
            let d = parseInt(b, 16);
            let side = (d >> xx*2) & 0x3;
            //console.log(y, x, yy, xx, b, d, side);
            board[y][x] = side;
        }
    }
    return board;
}

function printGameData(gameData) {
    console.log(`gameData ${gameData}`)
    let p = parseGameData(gameData);
    let board = "";
    for (let y = 0; y < 3; ++y) {
        if (board) board += "\n";
        for (let x = 0; x < 3; ++x) {
            board += SIDE_SYMBOLS[p[y][x]];
        }
    }
    console.log(board);
}

module.exports = {
    createMoveData: createMoveData,
    parseGameData: parseGameData,
    printGameData: printGameData
}
