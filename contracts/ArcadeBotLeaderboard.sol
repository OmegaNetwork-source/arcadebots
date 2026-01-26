// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ArcadeBotLeaderboard {
    // Best score for each player
    mapping(address => uint256) public bestScore;  
    
    // Total lifetime score
    mapping(address => uint256) public totalScore;

    // Array of all players
    address[] public players;

    // To check if player is already on the players array
    mapping(address => bool) private hasPlayed;

    // Event for UI/off-chain
    event NewScore(address indexed player, uint256 score, uint256 totalScore);

    /**
     * @dev Submit score for a player
     * @param score Score to add to total and check against best
     */
    function submitScore(uint256 score) external {
        require(score > 0, "Invalid score");
        
        if (!hasPlayed[msg.sender]) {
            players.push(msg.sender);
            hasPlayed[msg.sender] = true;
        }

        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
        }
        
        totalScore[msg.sender] += score;

        emit NewScore(msg.sender, score, totalScore[msg.sender]);
    }

    /**
     * @dev Get total number of players
     */
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    /**
     * @dev Get leaderboard data (paginated)
     */
    function getLeaderboard(uint256 limit, uint256 offset) external view returns (address[] memory, uint256[] memory, uint256[] memory) {
        uint256 len = players.length;
        if (offset >= len) return (new address[](0), new uint256[](0), new uint256[](0));
        
        uint256 count = limit;
        if (offset + limit > len) count = len - offset;
        
        address[] memory addrs = new address[](count);
        uint256[] memory bests = new uint256[](count);
        uint256[] memory totals = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            address player = players[offset + i];
            addrs[i] = player;
            bests[i] = bestScore[player];
            totals[i] = totalScore[player];
        }
        return (addrs, bests, totals);
    }
}
