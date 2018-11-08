import React from "react";
import { Link } from "react-router-dom";
import AppComponent from './AppComponent';
import GameContract from "./core/build/contracts/Game.json";
import GameRoundContract from "./core/build/contracts/GameRound.json";
import TxButton from "./components/TxButton"

class Game extends AppComponent {

    constructor(props) {
        super(props);
        this.Game = null;
        this.GameRound = null;
        this.game = null;
        this.state = {
            gameName: null,
            latestRounds: [],
            refresh : true,
            myGame : null
        }
        this.createNewRound = this.createNewRound.bind(this);
        this.refreshLatestRounds = this.refreshLatestRounds.bind(this);
    }

    async componentDidMount() {
        this.Game = this.getTruffleContract(GameContract);
        this.GameRound = this.getTruffleContract(GameRoundContract);;
        this.game = await this.Game.at(this.props.match.params.gameAddress);
        const gameName = await this.game.name.call();
        this.setState({ gameName });
        this.refreshLatestRounds(false);
    }
    componentWillUnmount(){
      this.setState({ refresh : false})
    }

    async createNewRound(e) {
      this.setState({myGame : 'InProgress'})
        const myAccount = this.props.app.state.accounts[0];
        const platform = this.props.app.platform;
        const gameEvent = this.props.app.gameEvent;
        const defaultNumberOfPlayers = await this.game.defaultNumberOfPlayers.call();
        await platform.createGameRound(gameEvent.address, this.game.address, defaultNumberOfPlayers, { from: myAccount })
          .then((r) => {
            this.refreshLatestRounds();
            console.log(r) ;
            const myGame = r.receipt.logs[0].address;
            this.setState({myGame});
          }
        ).catch( (e) =>{
          console.log(e);
          console.log('aborted!');
          this.setState({myGame : 'abort'});
          setTimeout(()=>{
            this.setState({myGame: null})
          }, 7700);
        });
    }

    async refreshLatestRounds(oneoff = true) {
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
        if( this.state.refresh === true && !oneoff){
          await new Promise(resolve => setTimeout(resolve,15000));
          this.refreshLatestRounds(false);
        }
      }

    render() {
      const { myGame } = this.state;
      const helper = this.props.app.state.helper;
        let listRounds = () => {
            let v = [];
            this.state.latestRounds.forEach(r => {
              const my = r.address === myGame || false;
              const html =
                  <tr key={r.address} className = {my? "bg-success" : ""}>
                      <td></td>
                      <td>{r.state}</td>
                      <td>
                        {
                          helper==='MetaMask'
                          ? (
                            <Link to={ `/r/${r.address.toLowerCase()}` }>
                              {
                                my
                                ? "Game is ready! Click to Join"
                                : r.address
                              }
                            </Link>
                          ):(
                            <span> {r.address}</span>
                          )
                        }
                      </td>
                  </tr>;
                my
                ? v.unshift(html) //this pushes to front of array so your game is first in the listRounds
                : v.push(html);
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
            <div id='game-creation'>
                <h2 className="text-center">{ `${this.state.gameName} ` }</h2>
                {console.log("myGame in game.jsx render(): ", myGame)}
                <TxButton
                  config=
                    {{
                      className : "m-2 btn",
                      success : "Round created!"
                    }}
                  onClick={ this.createNewRound }
                  helper={helper}
                  buttonState={myGame}
                  >
                  Create New Round
                </TxButton>
                {listRounds()}
            </div>
        );
    }
}

export default Game;
