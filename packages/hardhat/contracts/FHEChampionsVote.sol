// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEChampionsVote
 * @dev Privacy-preserving voting contract for UEFA Champions League favorites using FHE.
 *      Each user can update (revote) their encrypted vote anytime.
 */
contract FHEChampionsVote is SepoliaConfig {
    /// @dev Stores encrypted votes per voter
    mapping(address => euint32) private encryptedVotes;

    /// @dev Tracks if a user has ever voted before
    mapping(address => bool) private hasVoted;

    /**
     * @notice Submit or update your encrypted vote for your favorite club.
     * @param encryptedChoice The encrypted club ID (e.g., 1–4).
     * @param proof Zero-knowledge proof for encrypted input.
     */
    function submitVote(externalEuint32 encryptedChoice, bytes calldata proof) external {
        euint32 newVote = FHE.fromExternal(encryptedChoice, proof);

        encryptedVotes[msg.sender] = newVote;
        hasVoted[msg.sender] = true;

        // Allow decryption for user and contract
        FHE.allow(encryptedVotes[msg.sender], msg.sender);
        FHE.allowThis(encryptedVotes[msg.sender]);
    }

    /**
     * @notice Check if a user has voted at least once.
     * @param user Address to check.
     * @return True if the user has voted before.
     */
    function isVoted(address user) external view returns (bool) {
        return hasVoted[user];
    }

    /**
     * @notice Retrieve encrypted vote of a user.
     * @param user Address whose encrypted vote to retrieve.
     * @return Encrypted vote (only decryptable by user or contract).
     */
    function encryptedVoteOf(address user) external view returns (euint32) {
        return encryptedVotes[user];
    }
}
