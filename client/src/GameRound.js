import React from "react";
import AppComponent from './AppComponent';
import GameEventContract from "./core/build/contracts/GameEvent.json";
import GameContract from "./core/build/contracts/Game.json";
import GameRoundContract from "./core/build/contracts/GameRound.json";
import TicTacToeGameCanvas from './games/tictactoe/react/TicTacToeGameCanvas';

class GameRound extends AppComponent {
    gameRound = null;
    state = {
        gameName: null,
        gameRoundAddress: null,
        roundState: null,
        grantedAllowance: 0,
        isRoundOwner: false
    };

    async componentDidMount() {
        const Game = this.getTruffleContract(GameContract);
        const GameEvent = this.getTruffleContract(GameEventContract);
        const GameRound = this.getTruffleContract(GameRoundContract);
        this.gameRound = await GameRound.at(this.props.match.params.gameRoundAddress);
        this.gameEvent = await GameEvent.at(await this.gameRound.getGameEvent.call())
        const game = await Game.at(await this.gameRound.getGame());
        const gameRoundAddress = this.gameRound.address;
        const gameName = await game.name.call();
        this.setState({ gameName, gameRoundAddress });
        this.refreshState();
    }

    async refreshState() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const roundState = (await this.gameRound.getState.call()).toNumber();
        const isRoundOwner = (await this.gameRound.owner.call()) === this.props.app.state.accounts[0];
        const grantedAllowanceInWei = await this.gameEvent.getGrantedAllowance.call(this.state.gameRoundAddress, player);
        const grantedAllowance = web3.utils.fromWei(grantedAllowanceInWei.toString(), "ether");
        this.setState({ roundState, grantedAllowance, isRoundOwner });
    }

    async grantAllowance() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("0.1", "ether");
        await this.gameEvent.grantAllowance(this.state.gameRoundAddress, betSize, { from: player });
    }

    async joinGame() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("0.1", "ether");
        await this.gameRound.acceptInvitation(2, betSize, betSize, { from: player });
    }

    async selfInviteAndReady() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("0.1", "ether");
        await this.gameRound.selfInviteAndReady(1, betSize, betSize, { from: player });
    }

    render() {
        let controls = <div>Unknown State</div>;
        if (this.state.roundState === 0) {
            if (this.state.isRoundOwner) {
                controls =
                    <div>
                        <button className="btn btn-default" onClick={ this.grantAllowance.bind(this) }>
                            Grant Allowance
                        </button>
                        <br/>
                        <button className="btn btn-default" onClick={ this.selfInviteAndReady.bind(this) }>
                            Self Invite and Ready (as black/x side)
                        </button>
                    </div>;
            } else {
                controls =
                    <span className="text-warning">Waiting for the game to be ready...</span>
            }
        } else if (this.state.roundState === 1) {
            controls =
                <div>
                    <button className="btn btn-default" onClick={ this.grantAllowance.bind(this) }>
                        Grant Allowance
                    </button>
                    <br/>
                    <button className="btn btn-default" onClick={ this.joinGame.bind(this) }>
                        Join Game (as white/o side)
                    </button>
                </div>;
        } else if (this.state.roundState === 2 || this.state.roundState === 3) {
            let GameCanvas = () => (<div>Unsupported game!</div>);
            switch (this.state.gameName) {
                case "TicTacToe":
                    GameCanvas = TicTacToeGameCanvas;
                    break;
                default:
            }
            controls = <GameCanvas app={ this.props.app } appComponent={ this } gameRoundAddress={ this.state.gameRoundAddress }/>;
        }

        return (
            <div>
                <h2>{ this.state.gameName } Game Round</h2>
                <span className="">Granted Allowance: { this.state.grantedAllowance } ETH</span>
                <button className="btn btn-default" onClick={ this.refreshState.bind(this) }>
                    Refresh State
                </button>
                <br/>
                {controls}
            </div>
        );
    }
}

export default GameRound;
