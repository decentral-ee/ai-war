import React from "react";
import AppComponent from './AppComponent';
import GameEventContract from "ai-war-core/build/contracts/GameEvent.json";
import GameContract from "ai-war-core/build/contracts/Game.json";
import GameRoundContract from "ai-war-core/build/contracts/GameRound.json";
import TicTacToeGameCanvas from './games/tictactoe/react/components/TicTacToeGameCanvas';
import RPSGameCanvas from './games/rps/react/components/RPSGameCanvas';
import AIWarCore from "ai-war-core";


class GameRound extends AppComponent {
    gameRound = null;
    state = {
        gameName: null,
        gameRoundAddress: null,
        playerSide: 0,
        roundState: null,
        grantedAllowance: 0,
        lockedBalance: 0,
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
        const acc = this.props.app.state.accounts[0];
        const player = this.props.app.state.accounts[0];
        const numberOfPlayers = await this.gameRound.getNumberOfPlayers.call();
        let playerSide = 0;
        for (let i = 1; i <= numberOfPlayers; ++i) {
            if (await this.gameRound.getPlayer(i) === acc) playerSide = i;
        }
        const roundState = (await this.gameRound.getState.call()).toNumber();
        const isRoundOwner = (await this.gameRound.owner.call()) === acc;
        const grantedAllowanceInWei = await this.gameEvent.getGrantedAllowance.call(this.state.gameRoundAddress, player);
        const grantedAllowance = web3.utils.fromWei(grantedAllowanceInWei.toString(), "ether");
        const lockedBalanceInWei = await this.gameEvent.getLockedBalance.call(this.state.gameRoundAddress, player);
        const lockedBalance = web3.utils.fromWei(lockedBalanceInWei.toString(), "ether");
        this.setState({ isRoundOwner, roundState, playerSide, grantedAllowance, lockedBalance });
    }

    async grantAllowance() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("1.0", "ether");
        await this.gameEvent.grantAllowance(this.state.gameRoundAddress, betSize, { from: player });
    }

    async joinGame() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("1.0", "ether");
        await this.gameRound.acceptInvitation(2, betSize, betSize, { from: player });
    }

    async selfInviteAndReady() {
        const web3 = this.props.app.web3;
        const player = this.props.app.state.accounts[0];
        const betSize = web3.utils.toWei("1.0", "ether");
        await this.gameRound.selfInviteAndReady(1, betSize, betSize, { from: player });
    }

    render() {
        let controlPannel = <div/>;
        let gameCanvas = <div/>;

        switch (this.state.roundState) {
            case AIWarCore.GameRound.State.Preparing:
                controlPannel =
                    <div className="container">
                        <div className="row">
                            <div className="btn col-4">Granted: { this.state.grantedAllowance } ETH</div>
                            <button className="col-4 btn btn-default" onClick={ this.grantAllowance.bind(this) }>
                                Grant 1ETH More
                            </button>
                        </div>
                        <div className="row">{
                            this.state.isRoundOwner ?
                            <button className="btn btn-default" onClick={ this.selfInviteAndReady.bind(this) }>
                                Self Invite and Ready (as the first player)
                            </button>
                            :
                            <span className="text-warning">Waiting for the game to be ready...</span>
                        }</div>
                    </div>;
                break;
            case AIWarCore.GameRound.State.Ready:
                controlPannel =
                    <div className="container">
                        {
                        this.state.playerSide ?
                        <div className="row">
                            <div className="col-4">Player { this.state.playerSide }</div>
                            <div className="col-4">Bet Pot: { this.state.lockedBalance } ETH</div>
                        </div>
                        :
                        <div className="row">
                            <div className="btn col-4">Granted: { this.state.grantedAllowance } ETH</div>
                            <button className="col-4 btn btn-default" onClick={ this.grantAllowance.bind(this) }>
                                Grant 1ETH More
                            </button>
                        </div>
                        }
                        <div className="row">{
                            this.state.playerSide ?
                            <span className="text-warning">Player { this.state.playerSide }, waiting for the game to start...</span>
                            :
                            <button className="btn btn-default" onClick={ this.joinGame.bind(this) }>
                                Join Game (as the second player)
                            </button>
                        }</div>
                    </div>;
                break;
            case AIWarCore.GameRound.State.InProgress:
                controlPannel =
                    <div className="container">
                        <div className="row">
                            <span className="text-warning">Game In Progress</span> :
                        </div>
                        {
                        this.state.playerSide ?
                        <div className="row">
                            <div className="col-4">Player { this.state.playerSide }</div>
                            <div className="col-4">Bet Pot: { this.state.lockedBalance } ETH</div>
                        </div> :
                        <div className="row"/>
                        }
                    </div>
                break;
            case AIWarCore.GameRound.State.Ended:
                controlPannel =
                    <div className="container">
                        <div className="row">
                            <span className="text-warning">Game Ended</span> :
                        </div>
                        {
                            this.state.playerSide ?
                            <div className="row">
                                <div className="col-4">Player { this.state.playerSide }</div>
                                <div className="offset-2 col-4">Bet Pot: { this.state.lockedBalance } ETH</div>
                            </div> :
                            <div className="row"/>
                        }
                    </div>
                break;
            default:
                break;
        }

        {
            let GameCanvas = () => (<div>Unsupported game!</div>);
            switch (this.state.gameName) {
                case "TicTacToe":
                    GameCanvas = TicTacToeGameCanvas;
                    break;
                case "R-P-S":
                    GameCanvas = RPSGameCanvas;
                    break;
                default:
            }
            gameCanvas = <GameCanvas app={ this.props.app } appComponent={ this } gameRoundAddress={ this.state.gameRoundAddress }/>;
        }

        return (
            <div>
                <h2>{ this.state.gameName } Game Round</h2>
                <div className="container border border-secondary">
                    <button className="btn btn-default" onClick={ this.refreshState.bind(this) }>
                        Refresh Round
                    </button>
                    { controlPannel }
                </div>
                <div className="container border border-primary">
                    { gameCanvas }
                </div>
            </div>
        );
    }
}

export default GameRound;
