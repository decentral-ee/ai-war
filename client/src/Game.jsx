import React from "react";
import { Link } from "react-router-dom";
import AppComponent from './AppComponent';
import GameContract from "./core/build/contracts/Game.json";
import GameRoundContract from "./core/build/contracts/GameRound.json";

class Game extends AppComponent {
    Game = null
    GameRound = null
    game = null
    state = {
        gameName: null,
        latestRounds: []
    }

    constructor(props) {
        super(props);
        this.createNewRound = this.createNewRound.bind(this);
        this.refreshLatestRounds = this.refreshLatestRounds.bind(this);
    }

    async componentDidMount() {
        this.Game = this.getTruffleContract(GameContract);
        this.GameRound = this.getTruffleContract(GameRoundContract);;
        this.game = await this.Game.at(this.props.match.params.gameAddress);
        const gameName = await this.game.name.call();
        this.setState({ gameName });
        this.refreshLatestRounds();
    }

    async createNewRound() {
        const myAccount = this.props.app.state.accounts[0];
        const platform = this.props.app.platform;
        const gameEvent = this.props.app.gameEvent;
        const defaultNumberOfPlayers = await this.game.defaultNumberOfPlayers.call();
        await platform.createGameRound(gameEvent.address, this.game.address, defaultNumberOfPlayers, { from: myAccount });
    }

    async refreshLatestRounds() {
        const web3 = this.props.app.web3;
        let latestRounds = await this.getNPastLogs(10, 'AIWar_GameRound_Created(address,address)',[
            null,
            web3.utils.padLeft(this.game.address.toLowerCase(), 64)
        ]);
        async function getState(round) {
            switch ((await round.getState.call()).toNumber()) {
                case 0: return "Preparing";
                case 1: return "Ready";
                case 2: return "InProgress";
                case 3: return "Ended"
                default: return "Unknown";
            }
        }
        latestRounds = await Promise.all(latestRounds.map(async r => {
            let round = await this.GameRound.at(r.address);
            return {
                state: await getState(round),
                address: round.address
            };
        }));
        this.setState({ latestRounds });
    }

    render() {
        let listRounds = () => {
            let v = [];
            this.state.latestRounds.forEach(r => {
                v.push(
                    <tr key={r.address}>
                        <td></td>
                        <td>{r.state}</td>
                        <td><Link to={ `/r/${r.address.toLowerCase()}` }>{r.address}</Link></td>
                    </tr>);
            });
            return (
                <div className="container">
                    <strong>Latest Rounds</strong>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Stakes</th>
                                <th>Game State</th>
                                <th>Address</th>
                            </tr>
                        </thead>
                        <tbody>
                        {v}
                        </tbody>
                    </table>
                </div>
            );
        };

        return (
            <div>
                <h2 className="text-center">{ `${this.state.gameName} ` }</h2>
                <button className="btn btn-default" onClick={ this.createNewRound }>Create New Round</button>
                <button className="btn btn-default" onClick={ this.refreshLatestRounds }>
                    <span className="fas fa-sync" aria-hidden="true"></span>
                </button>
                {listRounds()}
            </div>
        );
    }
}

export default Game;
