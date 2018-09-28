pragma solidity ^0.4.23;

contract GameEvent {
    function grantAllowance(address gameRound, uint newAllowance) external;
    function getGrantedAllowance(address gameRound, address player) external view returns (uint);
    function getTotalGrantedAllowance(address player) external view returns (uint);

    function lockBalance(address player, uint balance) external returns (bool);
    function getLockedBalance(address gameRound, address player) external view returns (uint);
    function getTotalLockedBalance(address player) external view returns (uint);
    function transferLockedBalance(address from, address to, uint balance) external;
    function unlockAllBalance(address player) external;
}
