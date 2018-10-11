import React, { Component } from "react";
import GameContract from "ai-war-core/build/contracts/Game.json";
import GameRoundContract from "ai-war-core/build/contracts/GameRound.json";
import gameUtils from '../../utils';
import './RPSGameCanvas.css';

class RPSGameCanvas extends Component {
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
        //this.refreshBoard();
    }

    async refreshPlayground() {
    }

    render() {
        return (
            <div className="container">
                <div className="row">
                    <button className="btn btn-default" onClick={ this.refreshPlayground.bind(this) }>
                        Refresh Game
                    </button>
                </div>
                <div>
                    RPS Game
                </div>
            </div>
        );
    }
}

export default RPSGameCanvas;
