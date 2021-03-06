import React from "react";
import { Link } from "react-router-dom";
import AppComponent from './AppComponent';
import GameContract from "./core/build/contracts/Game.json";

function GameIcon(props) {
  return(
    <img src={"/" + props +".png"} alt={props}/>
  );
}

class Home extends AppComponent {
    state = { gameList: [] };

    async componentDidMount() {
        const Game = this.getTruffleContract(GameContract);
        const platform = this.props.app.platform;
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
        gameList.push({
            address: 0x0,
            name: "Gomoku"
        }, {
            address: 0x0,
            name: "Chess"
        });
        this.setState({ gameList });
    }

    render() {
        function GameSummary(props) {
            return (<div key={props.name} className={"col-12 col-sm-6 col-md-4 px-4 py-1 p-sm-1 " + props.name}>
                <Link to={(props.address !== 0x0) ? "/g/" + props.address.toLowerCase() : "" }>
                    <button type="button" className="btn btn-primary w-100" disabled={(props.address !== 0x0) ? false : true}>
                    {GameIcon(props.name)}
                    <h3 className="d-inline d-md-block align-middle">{props.name}</h3>
                  </button>
                </Link>
            </div>);
        }

        const gameList = this.state.gameList.map(i => <GameSummary key={i.name} address={i.address} name={i.name}/>);
        return (
            <div>
                <div className="gameList row">
                    {gameList}
                </div>
            </div>
        );
    }
}

export default Home;
