import React from "react";
import { Link } from "react-router-dom";
import AppComponent from './AppComponent';
import GameContract from "./contracts/Game.json";

class Home extends AppComponent {
    state = { gameList: [] };

    async componentDidMount() {
        const Game = this.getTruffleContract(GameContract);
        const platform = this.props.appState.platform;
        let gameList = await platform.listGames.call(0);
        gameList = await Promise.all(gameList.map(async gameAddress => {
            if (gameAddress === '0x0000000000000000000000000000000000000000') return null;
            try {
                const game = await Game.at(gameAddress);
                return {
                    address: gameAddress,
                    name: await game.name.call()
                }
            } catch (e) {
                console.warn(`Loading game at ${gameAddress} failed: `, e);
                return null;
            }
        }));
        gameList = gameList.filter(g => g !== null);
        this.setState({ gameList });
    }

    render() {
        function GameSummary(props) {
            return (<div>
                <Link to={"/g/" + props.address}>{props.name}</Link>
            </div>);
        }

        const gameList = this.state.gameList.map(i => <GameSummary key={i} address={i.address} name={i.name}/>);
        return (
            <div>
                <h2>Game List</h2>
                {gameList}
            </div>
        );
    }
}

export default Home;
