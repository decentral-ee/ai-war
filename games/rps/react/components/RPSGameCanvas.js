import React, { Component } from "react";
import GameContract from "ai-war-core/build/contracts/Game.json";
import GameRoundContract from "ai-war-core/build/contracts/GameRound.json";
import AIWarCore from 'ai-war-core';
import gameUtils from '../../utils';
import './RPSGameCanvas.css';

class RPSGameCanvas extends Component {
    game;
    round;
    state = {
        playerSide: 0,
        player: null,
        moves: [],
        played: false,
        state: AIWarCore.GameRound.State.InProgress,
    };

    async componentDidMount() {
        const GameRound = this.props.appComponent.getTruffleContract(GameRoundContract);
        const Game = this.props.appComponent.getTruffleContract(GameContract);
        this.round = await GameRound.at(this.props.appComponent.state.gameRoundAddress);
        this.game = await Game.at(await this.round.getGame.call());
        this.setState({
            playerSide: this.props.appComponent.state.playerSide,
            player: this.props.appComponent.state.player,
            lockedBalance: this.props.appComponent.state.lockedBalance,
        });
        this.refreshMoves();
    }

    async refreshMoves() {
        console.log(this.props.appComponent.state, this.state, "!!!");
        const syncedTurns = await this.round.getSyncedTurns();
        const fromTurn = 0;
        const untilTurn = (await this.round.getNumberOfMoves()).toNumber();
        let moves = [];
        let played = false;
        for (let i = fromTurn; i < untilTurn; ++i) {
            let move = await this.round.getMove(i);
            if (i >= syncedTurns &&
                this.state.playerSide === move.side.toNumber()) {
                played = true;
            }
            moves.unshift([i, move]);
        }
        this.setState({ moves, played })
    }

    getLocalStorageItemName() {
        return 'gameRound.' + this.props.appComponent.state.gameRoundAddress;
    }

    async makeSecretMove(moveData) {
        const salt = await AIWarCore.GameRound.generateSecretMoveSalt();
        const secretMoveHash = AIWarCore.GameRound.createSecretMoveHash(moveData, salt);
        const betSize = this.state.lockedBalance;
        console.debug("makeSecretMove", moveData, salt, secretMoveHash);
        localStorage.setItem(this.getLocalStorageItemName(), JSON.stringify({
            secretMove: {
                moveData,
                salt,
            }
        }));
        await this.round.makeSecretMove(
            this.state.playerSide, secretMoveHash,
            betSize, betSize, false, 0,
            { from: this.state.player });
    }

    async revealSecretMove(turn, secretMove) {
        await this.round.revealSecretMove(
            turn, secretMove.moveData, secretMove.salt,
            { from: this.state.player });
    }

    renderMoves(moves) {
        let moveName = {};
        moveName[gameUtils.Move.Rock] = 'rock';
        moveName[gameUtils.Move.Paper] = 'paper';
        moveName[gameUtils.Move.Scissor] = 'scissor';
        let rows = []
        moves.forEach(i => {
            let turn = i[0];
            let move = i[1];
            //console.debug(turn, move.side.toNumber(), move.isSecret, move.data.toNumber());
            if (this.state.playerSide === move.side.toNumber()) {
                let localGameData = localStorage.getItem(this.getLocalStorageItemName());
                try {
                    localGameData = JSON.parse(localGameData);
                } catch (e) {
                    console.warn(`Invalid localGameData: ${localGameData}`);
                }
                if (move.isSecret) {
                    if (localGameData && localGameData.secretMove) {
                        rows.push(<div className="row" key={ turn }>
                            <span className="text">You played { moveName[localGameData.secretMove.moveData] }. </span>
                            <span className="btn-link" onClick={ this.revealSecretMove.bind(this, turn, localGameData.secretMove) }>
                                [Reveal your move]
                            </span>
                        </div>);
                    } else {
                        rows.push(<div className="row" key={ turn }>
                            You played in other browser or lost move secret.
                        </div>);
                    }
                } else {
                    rows.push(<div className="row" key={ turn }>
                        <span className="text">You played { moveName[move.data.toNumber()] }. </span>
                    </div>);
                }
            } else {
                rows.push(<div className="row" key={ turn }>
                    Player { move.side.toNumber() } { move.isSecret ? 'played.' : `played ${moveName[move.data.toNumber()]}.` }
                </div>)
            }
        });
        return <div className="container">
            {rows}
        </div>
    }

    render() {
        return (
            <div className="container">
                <div className="row">
                    <button className="btn btn-default" onClick={ this.refreshMoves.bind(this) }>
                        Refresh Game
                    </button>
                </div>
                {
                (this.state.playerSide > 0 && !this.state.played) ?
                <div className="row">
                    <div className="col-4">Make Moves</div>
                    <div className="col-8">
                        <button className="btn btn-primary" onClick={ this.makeSecretMove.bind(this, gameUtils.Move.Rock) }>
                            Rock
                        </button>
                        <button className="btn btn-primary" onClick={ this.makeSecretMove.bind(this, gameUtils.Move.Paper) }>
                            Paper
                        </button>
                        <button className="btn btn-primary" onClick={ this.makeSecretMove.bind(this, gameUtils.Move.Scissor) }>
                            Scissor
                        </button>
                    </div>
                </div>
                :
                null
                }
                <div>
                    { this.renderMoves(this.state.moves) }
                </div>
            </div>
        );
    }
}

export default RPSGameCanvas;
