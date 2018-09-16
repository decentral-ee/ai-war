pragma solidity ^0.4.23;

contract GameEvent {
    function grantBalanceLock(address gameRound, int balance) public;
    function getBrantedBalanceLock(address player) public view;
    function lockBalance(address player) public;
    function transferBalance(address from, address to) public;
    function unlockBalance(address player) public;
}
