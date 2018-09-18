pragma solidity ^0.4.23;

import "./Game.sol";
import "./GameEvent.sol";
import {GameRoundCallback, GameRound} from "./GameRound.sol";

contract AIWarPlatform is GameRoundCallback {
    uint totalRoundsStarted;
    uint totalRoundsEnded;

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

    mapping (address => GameStats) gameStatsMapping;
    mapping (address => GameEventStats) gameEventStatsMapping;
    mapping (address => GameRoundInfo) gameRoundInfoMapping;

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

    function registerGame(address game) external {
        require(gameStatsMapping[game].registeredSinceBlock == 0, "Game already registered");
        gameStatsMapping[game].registeredSinceBlock = block.number;
    }

    function registerGameEvent(address gameEvent) external {
        require(gameEventStatsMapping[gameEvent].registeredSinceBlock == 0, "GameEvent already registered");
        gameEventStatsMapping[gameEvent].registeredSinceBlock = block.number;
    }

    function createGameRound(GameEvent gameEvent, Game game) external {
        GameEventStats storage gameEventStats = gameEventStatsMapping[gameEvent];
        GameStats storage gameStats  = gameStatsMapping[game];
        require(gameEventStats.registeredSinceBlock != 0, "GameEvent not registered");
        require(gameStats.registeredSinceBlock != 0, "Game not registered");
        GameRound gameRound = new GameRound(this, gameEvent, game);
        gameRound.transferOwnership(msg.sender);
        gameRoundInfoMapping[gameRound].gameEvent = gameEvent;
        gameRoundInfoMapping[gameRound].game = game;
    }

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
}
