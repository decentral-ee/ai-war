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

    function grantAllowance(address gameRound, uint newAllowance) external {
        uint existingTotalAllowance = totalGrantedAllowance[msg.sender];
        uint currentAllowance = grantedAllowance[gameRound][msg.sender];
        require(deposits[msg.sender] >= existingTotalAllowance - currentAllowance + newAllowance, "Not enough deposit");
        totalGrantedAllowance[msg.sender] -= currentAllowance;
        totalGrantedAllowance[msg.sender] += newAllowance;
        grantedAllowance[gameRound][msg.sender] = newAllowance;
    }

    function getGrantedAllowance(address player) external view returns (uint) {
        return grantedAllowance[msg.sender][player];
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

    function getLockedBalance(address player) external view returns (uint) {
        return lockedBalance[msg.sender][player];
    }

    function unlockAllBalance(address player) external {
        uint balance = lockedBalance[msg.sender][player];
        grantedAllowance[msg.sender][player] += balance;
        totalGrantedAllowance[player] += balance;
        totalLockedBalance[player] -= balance;
    }

    function transferLockedBalance(address from, address to, uint balance) external {
        require(balance <= lockedBalance[msg.sender][from], "Not enough locked balance");
        to.transfer(balance);
        lockedBalance[msg.sender][from] -= balance;
        totalLockedBalance[from] -= balance;
        deposits[from] -= balance;
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
