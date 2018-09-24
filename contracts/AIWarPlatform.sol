pragma solidity ^0.4.23;

import "./Game.sol";
import "./GameEvent.sol";
import {GameRoundCallback, GameRound} from "./GameRound.sol";

contract AIWarPlatform is GameRoundCallback {
    //
    // Statistics
    //
    uint constant private SORTED_GAME_LIST_SECTION_SIZE = 10;

    uint private totalRoundsStarted;
    uint private totalRoundsEnded;

    struct GameStats {
        uint registeredSinceBlock;
        uint roundsStarted;
        uint roundsEnded;
    }

    struct GameEventStats {
        uint registeredSinceBlock;
        uint roundsStarted;
        uint roundsEnded;
    }

    struct GameRoundInfo {
        address gameEvent;
        address game;
    }

    mapping (address => GameStats) private gameStatsMapping;
    mapping (address => GameEventStats) private gameEventStatsMapping;
    mapping (address => GameRoundInfo) private gameRoundInfoMapping;
    address[] gameList;

    function getTotalGameRoundStarted() external view returns (uint) {
        return totalRoundsStarted;
    }
    function getTotalGameRoundEnded() external view returns (uint) {
        return totalRoundsEnded;
    }
    function getGameRoundStartedByGame(address game) external view returns (uint) {
        return gameStatsMapping[game].roundsStarted;
    }
    function getGameRoundEndedByGame(address game) external view returns (uint) {
        return gameStatsMapping[game].roundsEnded;
    }
    function getGameRoundStartedByEvent(address gameEvent) external view returns (uint) {
        return gameEventStatsMapping[gameEvent].roundsStarted;
    }
    function getGameRoundEndedByEvent(address gameEvent) external view returns (uint) {
        return gameEventStatsMapping[gameEvent].roundsEnded;
    }
    function listGames(uint start) external view returns (address[10] result) {
        uint size = gameList.length - start;
        if (size > 10) size = 10;
        for (uint i = 0; i < size; ++i) {
            result[i] = gameList[start + i];
        }
    }

    //
    // GameRoundCallback interface
    //
    function gameRoundStarted(address gameEvent, address game, address gameRound) external {
        require(msg.sender == gameRound, "Unauthorized game round callbacker");
        require(gameRoundInfoMapping[gameRound].gameEvent == gameEvent, "GameRound gameEvent address mismatch");
        require(gameRoundInfoMapping[gameRound].game == game, "GameRound game address mismatch");
        GameEventStats storage gameEventStats = gameEventStatsMapping[gameEvent];
        GameStats storage gameStats = gameStatsMapping[game];
        gameEventStats.roundsStarted++;
        gameStats.roundsStarted++;
        totalRoundsStarted++;
    }

    function gameRoundEnded(address gameEvent, address game, address gameRound) external {
        require(msg.sender == gameRound, "Unauthorized game round callbacker");
        require(gameRoundInfoMapping[gameRound].gameEvent == gameEvent, "GameRound gameEvent address mismatch");
        require(gameRoundInfoMapping[gameRound].game == game, "GameRound game address mismatch");
        GameEventStats storage gameEventStats = gameEventStatsMapping[gameEvent];
        GameStats storage gameStats = gameStatsMapping[game];
        gameEventStats.roundsEnded++;
        gameStats.roundsEnded++;
        totalRoundsEnded++;
    }

    //
    // Platform API
    //
    function registerGame(address game) external {
        require(gameStatsMapping[game].registeredSinceBlock == 0, "Game already registered");
        gameStatsMapping[game].registeredSinceBlock = block.number;
        gameList.push(game);
    }

    function registerGameEvent(address gameEvent) external {
        require(gameEventStatsMapping[gameEvent].registeredSinceBlock == 0, "GameEvent already registered");
        gameEventStatsMapping[gameEvent].registeredSinceBlock = block.number;
    }

    function createGameRound(
        GameEvent gameEvent,
        Game game,
        uint expectedNumberOfPlayers) public {
        GameEventStats storage gameEventStats = gameEventStatsMapping[gameEvent];
        GameStats storage gameStats  = gameStatsMapping[game];
        require(gameEventStats.registeredSinceBlock != 0, "GameEvent not registered");
        require(gameStats.registeredSinceBlock != 0, "Game not registered");
        GameRound gameRound = new GameRound(this, gameEvent, game, expectedNumberOfPlayers);
        gameRound.transferOwnership(msg.sender);
        gameRoundInfoMapping[gameRound].gameEvent = gameEvent;
        gameRoundInfoMapping[gameRound].game = game;
    }
}
