// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title SomniaArcadeLeaderboard
 * @dev A high-performance leaderboard contract for the Somnia Arcade ecosystem.
 * Updated for Solidity 0.8.26 compatibility.
 */
contract SomniaArcadeLeaderboard {
    struct PlayerInfo {
        uint256 score;
        uint256 timestamp;
        bool exists;
    }

    // Mapping from player address to their high score info
    mapping(address => PlayerInfo) public playerHighScores;
    
    // List of all players who have submitted a score
    address[] public players;

    // Events
    event ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp);
    event NewHighScore(address indexed player, uint256 score);

    /**
     * @dev Submit a new score for the sender.
     * Updates the high score if the new score is higher.
     * @param _score The score achieved by the player.
     */
    function submitScore(uint256 _score) public {
        if (!playerHighScores[msg.sender].exists) {
            players.push(msg.sender);
            playerHighScores[msg.sender].exists = true;
        }

        emit ScoreSubmitted(msg.sender, _score, block.timestamp);

        if (_score > playerHighScores[msg.sender].score) {
            playerHighScores[msg.sender].score = _score;
            playerHighScores[msg.sender].timestamp = block.timestamp;
            emit NewHighScore(msg.sender, _score);
        }
    }

    /**
     * @dev Returns the total number of players on the leaderboard.
     */
    function getPlayerCount() public view returns (uint256) {
        return players.length;
    }

    /**
     * @dev Returns the high score for a specific player.
     * @param _player The address of the player.
     */
    function getPlayerScore(address _player) public view returns (uint256 score, uint256 timestamp) {
        PlayerInfo storage info = playerHighScores[_player];
        return (info.score, info.timestamp);
    }

    /**
     * @dev Returns a list of players and their scores.
     * @param _limit The maximum number of players to return.
     */
    function getLeaderboard(uint256 _limit) public view returns (address[] memory, uint256[] memory) {
        uint256 count = players.length;
        if (_limit < count) {
            count = _limit;
        }

        address[] memory addresses = new address[](count);
        uint256[] memory scores = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            addresses[i] = players[i];
            scores[i] = playerHighScores[players[i]].score;
        }

        return (addresses, scores);
    }
}
