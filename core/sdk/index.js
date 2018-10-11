'use strict';

const Game = {
    GameOverReason: {
        NOT_OVER: 0,
        HAS_WINNER: 1,
        HAS_VIOLATOR: 2,
        TIED: 3
    }
};

const GameRound = require("./game_round");

module.exports = {
    Game,
    GameRound
};
