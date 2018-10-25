pragma solidity ^0.4.23;

contract OpenEtherbetGameEvent {
    //
    // Invariants:
    //
    // deposits >= totalGrantedAllowance + totalLockedBalance
    // totalGrantedAllowance[player] = sum(grantedAllowance[*][player])
    // totalLockedBalance[player] = sum(lockedBalance[*][player])
    //

    // player -> deposits
    mapping(address => uint) deposits;

    // gameround -> player -> grantedAllowance
    mapping(address => mapping(address => uint)) grantedAllowance;

    // gameround -> player -> lockedBalance
    mapping(address => mapping(address => uint)) lockedBalance;

    // player -> grantedAllowance
    mapping(address => uint) totalGrantedAllowance;

    // player -> grantedAllowance
    mapping(address => uint) totalLockedBalance;

    function getDepositAmount(address player) external view returns (uint) {
        return deposits[player];
    }

    function grantAllowance(address gameRound, uint newAllowance) external {
        uint existingTotalAllowance = totalGrantedAllowance[msg.sender];
        uint currentAllowance = grantedAllowance[gameRound][msg.sender];
        require(deposits[msg.sender] >= existingTotalAllowance - currentAllowance + newAllowance, "Not enough deposit");
        totalGrantedAllowance[msg.sender] -= currentAllowance;
        totalGrantedAllowance[msg.sender] += newAllowance;
        grantedAllowance[gameRound][msg.sender] = newAllowance;
    }

    function getGrantedAllowance(address gameRound, address player) external view returns (uint) {
        return grantedAllowance[gameRound][player];
    }

    function getTotalGrantedAllowance(address player) external view returns (uint) {
        return totalGrantedAllowance[player];
    }

    function lockBalance(address player, uint balance) external returns (bool) {
        if (grantedAllowance[msg.sender][player] >= balance) {
            lockedBalance[msg.sender][player] += balance;
            grantedAllowance[msg.sender][player] -= balance;
            totalGrantedAllowance[player] -= balance;
            totalLockedBalance[player] += balance;
            return true;
        } else {
            return false;
        }
    }

    function getLockedBalance(address gameRound, address player) external view returns (uint) {
        return lockedBalance[gameRound][player];
    }

    function getTotalLockedBalance(address player) external view returns (uint) {
        return totalLockedBalance[player];
    }

    function unlockAllBalance(address player) external {
        uint balance = lockedBalance[msg.sender][player];
        grantedAllowance[msg.sender][player] = 0;
        totalLockedBalance[player] -= balance;
        lockedBalance[msg.sender][player] = 0;
    }

    function transferLockedBalance(address from, address to, uint balance) external {
        require(balance <= lockedBalance[msg.sender][from], "Not enough locked balance");
        lockedBalance[msg.sender][from] -= balance;
        totalLockedBalance[from] -= balance;
        deposits[from] -= balance;
        deposits[to] += balance;
    }

    function deposit() public payable {
        deposits[msg.sender] += msg.value;
    }

    function withdrawAll() public {
        uint a = totalGrantedAllowance[msg.sender];
        uint b = totalLockedBalance[msg.sender];
        uint w = deposits[msg.sender] - (a + b);
        msg.sender.transfer(w);
        deposits[msg.sender] = a + b;
    }
}
