// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { IERC20Minimal } from "./interfaces/IERC20Minimal.sol";
import { IPulseMarketAdapter } from "./interfaces/IPulseMarketAdapter.sol";
import { ISomniaEventHandler } from "./interfaces/ISomniaEventHandler.sol";

contract PulseSession is ISomniaEventHandler {
    enum Rule {
        Hold,
        MartingaleOff,
        StopOnLoss
    }

    struct Policy {
        uint256 maxStakePerWindow;
        uint32 maxWindows;
        uint64 expiry;
        Rule rule;
    }

    address public constant SOMNIA_REACTIVITY_PRECOMPILE =
        0x0000000000000000000000000000000000000100;

    address public owner;
    IERC20Minimal public collateral;
    IPulseMarketAdapter public marketAdapter;
    Policy public policy;
    bool public armed;
    bool public initialized;
    uint32 public windowsUsed;

    mapping(bytes32 marketId => bool allowed) public allowedMarket;
    mapping(bytes32 marketId => bool tracked) public trackedMarket;
    bytes32[] public trackedMarketIds;

    bool private locked;

    event Initialized(
        address indexed owner, address indexed collateral, address indexed marketAdapter
    );
    event Deposited(address indexed owner, uint256 amount);
    event Placed(bytes32 indexed marketId, uint8 side, uint256 stake, bytes32 orderId);
    event MarketAllowed(bytes32 indexed marketId);
    event Redeemed(bytes32 indexed marketId, uint256 credited);
    event RedeemFailed(bytes32 indexed marketId, bytes reason);
    event Disarmed();
    event Rearmed(uint64 expiry, uint32 maxWindows);
    event Withdrawn(address indexed owner, uint256 amount);

    error AlreadyInitialized();
    error NotOwner();
    error ReentrantCall();
    error InvalidAddress();
    error InvalidPolicy();
    error MarketNotAllowed(bytes32 marketId);
    error MarketNotTrading(bytes32 marketId);
    error StakeTooHigh(uint256 stake, uint256 maxStakePerWindow);
    error SessionExpired();
    error WindowLimitReached();
    error OnlyReactivityPrecompile();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    function initialize(
        address owner_,
        address collateral_,
        address marketAdapter_,
        Policy calldata policy_,
        bytes32[] calldata allowedMarketIds
    ) external {
        if (initialized) revert AlreadyInitialized();
        if (owner_ == address(0) || collateral_ == address(0) || marketAdapter_ == address(0)) {
            revert InvalidAddress();
        }
        if (
            policy_.maxStakePerWindow == 0 || policy_.maxWindows == 0
                || policy_.expiry <= block.timestamp
        ) {
            revert InvalidPolicy();
        }

        initialized = true;
        owner = owner_;
        collateral = IERC20Minimal(collateral_);
        marketAdapter = IPulseMarketAdapter(marketAdapter_);
        policy = policy_;
        armed = true;

        for (uint256 i = 0; i < allowedMarketIds.length; i++) {
            allowedMarket[allowedMarketIds[i]] = true;
        }

        emit Initialized(owner_, collateral_, marketAdapter_);
    }

    /*
     * Owner-signed top-up of the allow-list. Rotating windows (e.g. every 15 minutes) mint a
     * fresh marketId per window, so a one-time snapshot at createSession() goes stale as soon
     * as the window rolls. This keeps the allow-list as the enforcement mechanism — every
     * market still needs an explicit, owner-signed grant — while letting the owner extend it
     * over the session's lifetime instead of only once at deploy time.
     */
    function addAllowedMarket(bytes32[] calldata marketIds) external onlyOwner {
        for (uint256 i = 0; i < marketIds.length; i++) {
            allowedMarket[marketIds[i]] = true;
            emit MarketAllowed(marketIds[i]);
        }
    }

    function deposit(uint256 amount) external onlyOwner nonReentrant {
        if (!collateral.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Deposited(msg.sender, amount);
    }

    function place(bytes32 marketId, uint8 side, uint256 stake)
        external
        onlyOwner
        nonReentrant
        returns (bytes32 orderId)
    {
        _checkPlace(marketId, stake);

        collateral.approve(address(marketAdapter), stake);
        orderId = marketAdapter.place(marketId, side, stake, address(this));
        windowsUsed += 1;
        _trackMarket(marketId);

        emit Placed(marketId, side, stake, orderId);
    }

    /*
     * Reactivity callback. The signature is fixed by the protocol
     * (ISomniaEventHandler, selector 0x53edf33d) — see that interface for why an
     * approximate signature silently never fires.
     *
     * The arguments are deliberately unused: the subscription is already scoped to
     * this session's markets, and a settlement anywhere in the tracked set is reason
     * enough to sweep all of them. Redeeming a market that has not settled yet is a
     * no-op the catch below absorbs, so re-checking the payload would buy nothing.
     */
    function onEvent(address, bytes32[] calldata, bytes calldata) external nonReentrant {
        if (msg.sender != SOMNIA_REACTIVITY_PRECOMPILE) revert OnlyReactivityPrecompile();

        for (uint256 i = 0; i < trackedMarketIds.length; i++) {
            bytes32 marketId = trackedMarketIds[i];

            try marketAdapter.redeemHeld(address(this), marketId) returns (uint256 credited) {
                emit Redeemed(marketId, credited);
            } catch (bytes memory reason) {
                emit RedeemFailed(marketId, reason);
            }
        }
    }

    function disarm() external onlyOwner {
        armed = false;
        emit Disarmed();
    }

    /*
     * Bring a spent session back into service. Without this, `armed` was write-once-false
     * and `policy.expiry` was fixed at initialize, so a session that ran out of time or was
     * disarmed became permanently unusable — and the factory stores one session per owner,
     * so that wallet could never open another. Only the two exhaustible limits are
     * refreshed: `maxStakePerWindow` and `rule` are the caps that make the policy a real
     * guarantee, so they stay immutable for the life of the clone.
     */
    function rearm(uint64 newExpiry, uint32 newMaxWindows) external onlyOwner {
        if (newExpiry <= block.timestamp) revert InvalidPolicy();
        if (newMaxWindows == 0) revert InvalidPolicy();

        policy.expiry = newExpiry;
        policy.maxWindows = newMaxWindows;
        windowsUsed = 0;
        armed = true;

        emit Rearmed(newExpiry, newMaxWindows);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (!collateral.transfer(owner, amount)) revert TransferFailed();
        emit Withdrawn(owner, amount);
    }

    function trackedMarketCount() external view returns (uint256) {
        return trackedMarketIds.length;
    }

    function _checkPlace(bytes32 marketId, uint256 stake) internal view {
        if (!armed) revert WindowLimitReached();
        if (!allowedMarket[marketId]) revert MarketNotAllowed(marketId);
        if (stake > policy.maxStakePerWindow) revert StakeTooHigh(stake, policy.maxStakePerWindow);
        if (block.timestamp > policy.expiry) revert SessionExpired();
        if (windowsUsed >= policy.maxWindows) revert WindowLimitReached();
        if (marketAdapter.status(marketId) != IPulseMarketAdapter.MarketStatus.Trading) {
            revert MarketNotTrading(marketId);
        }
    }

    function _trackMarket(bytes32 marketId) internal {
        if (trackedMarket[marketId]) return;
        trackedMarket[marketId] = true;
        trackedMarketIds.push(marketId);
    }
}
