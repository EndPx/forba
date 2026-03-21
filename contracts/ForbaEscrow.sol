// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ForbaEscrow
 * @notice Trustless USDC escrow for AI agent marketplace on Base
 * @dev Orchestrator (owner) creates escrows, releases on successful delivery,
 *      or refunds on failure. All actions are on-chain and auditable.
 */
contract ForbaEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    enum EscrowState { Created, Released, Refunded }

    struct Escrow {
        address payer;
        address payee;
        uint256 amount;
        EscrowState state;
        uint256 createdAt;
    }

    mapping(bytes32 => Escrow) public escrows;
    bytes32[] public escrowIds;

    // --- Events ---
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        uint256 amount
    );
    event EscrowReleased(bytes32 indexed escrowId, address indexed payee, uint256 amount);
    event EscrowRefunded(bytes32 indexed escrowId, address indexed payer, uint256 amount);

    // --- Errors ---
    error EscrowAlreadyExists(bytes32 escrowId);
    error EscrowNotActive(bytes32 escrowId);
    error ZeroAmount();
    error ZeroAddress();

    constructor(address _usdc, address _owner) Ownable(_owner) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Create a new escrow — locks USDC in the contract
     * @param escrowId Unique identifier (keccak256 of taskId + subtaskId)
     * @param payee Agent wallet address that will receive payment
     * @param amount USDC amount (6 decimals, e.g. 1 USDC = 1000000)
     */
    function createEscrow(
        bytes32 escrowId,
        address payee,
        uint256 amount
    ) external nonReentrant {
        if (escrows[escrowId].payer != address(0)) revert EscrowAlreadyExists(escrowId);
        if (amount == 0) revert ZeroAmount();
        if (payee == address(0)) revert ZeroAddress();

        // Effects before interactions (CEI pattern)
        escrows[escrowId] = Escrow({
            payer: msg.sender,
            payee: payee,
            amount: amount,
            state: EscrowState.Created,
            createdAt: block.timestamp
        });
        escrowIds.push(escrowId);

        // Interaction: pull USDC from payer
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(escrowId, msg.sender, payee, amount);
    }

    /**
     * @notice Release escrow to payee — called when agent delivers successfully
     * @param escrowId The escrow to release
     */
    function releaseEscrow(bytes32 escrowId) external nonReentrant onlyOwner {
        Escrow storage e = escrows[escrowId];
        if (e.state != EscrowState.Created) revert EscrowNotActive(escrowId);

        e.state = EscrowState.Released;
        usdc.safeTransfer(e.payee, e.amount);

        emit EscrowReleased(escrowId, e.payee, e.amount);
    }

    /**
     * @notice Refund escrow to payer — called when agent fails evaluation
     * @param escrowId The escrow to refund
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant onlyOwner {
        Escrow storage e = escrows[escrowId];
        if (e.state != EscrowState.Created) revert EscrowNotActive(escrowId);

        e.state = EscrowState.Refunded;
        usdc.safeTransfer(e.payer, e.amount);

        emit EscrowRefunded(escrowId, e.payer, e.amount);
    }

    // --- View Functions ---

    function getEscrow(bytes32 escrowId) external view returns (
        address payer,
        address payee,
        uint256 amount,
        EscrowState state,
        uint256 createdAt
    ) {
        Escrow storage e = escrows[escrowId];
        return (e.payer, e.payee, e.amount, e.state, e.createdAt);
    }

    function getEscrowCount() external view returns (uint256) {
        return escrowIds.length;
    }

    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
