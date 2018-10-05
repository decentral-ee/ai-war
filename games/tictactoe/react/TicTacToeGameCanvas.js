import React, { Component } from "react";
import GameContract from "../../../core/build/contracts/Game.json";
import GameRoundContract from "../../../core/build/contracts/GameRound.json";
import gameUtils from '../utils';
import './TicTacToeGameCanvas.css';

class TicTacToeGameCanvas extends Component {
    game = null;
    round = null;
    state = {
        boardData: [],
        state: 2,
        gameOverCausingSide: 0,
        gameOverReasonStr: ""
    };

    async componentDidMount() {
        const GameRound = this.props.appComponent.getTruffleContract(GameRoundContract);
        const Game = this.props.appComponent.getTruffleContract(GameContract);
        this.round = await GameRound.at(this.props.gameRoundAddress);
        this.game = await Game.at(await this.round.getGame.call());
        this.refreshBoard();
    }

    async refreshBoard() {
        let moves = [];
        const n = await this.round.getNumberOfMoves.call();
        for (let i = 0; i < n; ++i) {
            moves.push(await this.round.getMove.call(i));
        }
        const boardData = gameUtils.parseGameData("0x000000");
        moves.forEach(move => {
            const side = move.side.toNumber();
            const {x, y} = gameUtils.parseMoveData(move.data);
            //console.log("refreshBoard", x, y, move.data.toNumber());
            boardData[y][x] = side;
        });
        const state = (await this.round.getState.call()).toNumber();
        let gameOverCausingSide, gameOverReasonStr;
        if (state === 3) {
            gameOverCausingSide = (await this.round.getCausingSide.call()).toNumber();
            const gameOverReason = (await this.round.getGameOverReason.call()).toNumber();
            gameOverReasonStr = await this.game.decodeGameOverReason.call(gameOverReason);
        }
        this.setState({ boardData, state, gameOverCausingSide, gameOverReasonStr });
    }

    async makeMove(x, y) {
        const web3 = this.props.app.web3;
        const moveData = gameUtils.createMoveData(x, y);
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("0.1", "ether");
        const side = await this.round.getPlayer.call(1) === player ? 1 : 2;
        console.log("makeMove", side, moveData);
        await this.round.makeMove(side, moveData, betSize, betSize, false, 0,  { from: player });
    }

    async checkWinner() {
        const player = this.props.app.state.accounts[0];
        const n = await this.round.getNumberOfMoves.call();
        await this.round.syncGameData(n, { from: player});
        this.refreshBoard();
    }

    async settlePayout() {
        const player = this.props.app.state.accounts[0];
        await this.round.settlePayout({ from: player });
    }

    getSideSymbol(x, y) {
        const SIDE_SYMBOLS = {1:'x', 2:'o'};
        if (this.state.boardData[y] && this.state.boardData[y][x]) {
            return SIDE_SYMBOLS[this.state.boardData[y][x]]
        } else {
            return '';
        }
    }

    render() {
        let board = [];
        for (let y = 0; y < 3; ++y) {
            let row = [];
            for (let x = 0; x < 3; ++x) {
                row.push(<td key={x} onClick={ this.makeMove.bind(this, x, y) }>
                    { this.getSideSymbol(x, y) }
                </td>);
            }
            board.push(<tr key={y}>{row}</tr>);
        }
        let gameStateControls;
        if (this.state.gameOverCausingSide) {
            gameStateControls = <div>
                <span className="text-info">
                    Game Over: {this.state.gameOverReasonStr}, caused by {this.state.gameOverCausingSide}
                </span>
                <br/>
                <button className="btn btn-default" onClick={ this.settlePayout.bind(this) }>
                    Settle Payout
                </button>
            </div>;
        } else {
            gameStateControls =
                <button className="btn btn-default" onClick={ this.checkWinner.bind(this) }>
                    Check Winner
                </button>;
        }
        return (
            <div className="container">
                <button className="btn btn-default" onClick={ this.refreshBoard.bind(this) }>
                    <span className="fas fa-sync" aria-hidden="true"></span>
                </button>
                <table className="tictactoe_canvas">
                    <tbody>
                        {board}
                    </tbody>
                </table>
                {gameStateControls}
            </div>
        );
    }
}

export default TicTacToeGameCanvas;
