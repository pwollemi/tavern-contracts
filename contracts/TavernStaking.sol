// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract TavernStaking is Initializable, OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of MEADs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accMeadPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accMeadPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }
    // Info of each pool.
    struct PoolInfo {
        address lpToken; // Address of LP token contract.
        uint256 lastRewardBlock; // Last block number that MEADs distribution occurs.
        uint256 accMeadPerShare; // Accumulated MEADs per share, times 1e12. See below.
    }
    // The MEAD TOKEN!
    address public mead;
    // Block number when bonus MEAD period ends.
    uint256 public bonusFirstEndBlock;
    uint256 public bonusSecondEndBlock;
    // MEAD tokens created per block.
    uint256 public meadPerBlock;
    // Bonus muliplier for early mead makers.
    uint256 public constant FIRST_BONUS_MULTIPLIER = 6;
    uint256 public constant SECOND_BONUS_MULTIPLIER = 3;
    // The block number when MEAD mining starts.
    uint256 public startBlock;
    // Info of each pool.
    PoolInfo public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user,uint256 amount);

    function initialize(
        address _mead,
        uint256 _meadPerBlock,
        uint256 _startBlock,
        uint256 _bonusFirstEndBlock,
        uint256 _bonusSecondEndBlock
    ) external initializer {
        __Ownable_init();

        mead = _mead;
        meadPerBlock = _meadPerBlock;
        bonusFirstEndBlock = _bonusFirstEndBlock;
        bonusSecondEndBlock = _bonusSecondEndBlock;
        startBlock = _startBlock;
    }

    // Set pool info of LP token to the pool. Can only be called by the owner.
    function setPoolInfo(
        address _lpToken,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            updatePool();
        }
        uint256 lastRewardBlock =
            block.number > startBlock ? block.number : startBlock;
        poolInfo = PoolInfo({
            lpToken: _lpToken,
            lastRewardBlock: lastRewardBlock,
            accMeadPerShare: 0
        });
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to)
        public
        view
        returns (uint256)
    {
        if(_from >= _to) {
            return 0;
        }
        // First case ===> _from <= bonusFirstEndBlock and below 3 cases of _to
        if(_from <= bonusFirstEndBlock) {
            if (_to <= bonusFirstEndBlock) {
                return _to.sub(_from).mul(FIRST_BONUS_MULTIPLIER);
            } else if(_to > bonusFirstEndBlock && _to <= bonusSecondEndBlock) {
                return bonusFirstEndBlock.sub(_from).mul(FIRST_BONUS_MULTIPLIER).add(
                    _to.sub(bonusFirstEndBlock).mul(SECOND_BONUS_MULTIPLIER)
                );
            } else {
                return bonusFirstEndBlock.sub(_from).mul(FIRST_BONUS_MULTIPLIER).add(
                    bonusSecondEndBlock.sub(bonusFirstEndBlock).mul(SECOND_BONUS_MULTIPLIER)
                ).add(_to.sub(bonusSecondEndBlock));
            }
        }
        // Second case ===> _from <= bonusSecondEndBlock
        else if(_from > bonusFirstEndBlock && _from < bonusSecondEndBlock) {
            if(_to <= bonusSecondEndBlock) {
                return _to.sub(_from).mul(SECOND_BONUS_MULTIPLIER);
            } else {
                return bonusSecondEndBlock.sub(_from).mul(SECOND_BONUS_MULTIPLIER).add(
                    _to.sub(bonusSecondEndBlock)
                );
            }
        }
        // Third case ===> _from > bonusSecondEndBlock
        else {
            return _to.sub(_from);
        }
    }

    // View function to see pending MEADs on frontend.
    function pendingRewards(address _user)
        external
        view
        returns (uint256)
    {
        UserInfo storage user = userInfo[_user];
        uint256 accMeadPerShare = poolInfo.accMeadPerShare;
        uint256 lpSupply = IERC20Upgradeable(poolInfo.lpToken).balanceOf(address(this));
        if (block.number > poolInfo.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(poolInfo.lastRewardBlock, block.number);
            uint256 meadReward = multiplier.mul(meadPerBlock);
            accMeadPerShare = accMeadPerShare.add(
                meadReward.mul(1e12).div(lpSupply)
            );
        }
        return user.amount.mul(accMeadPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool() public {
        if (block.number <= poolInfo.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = IERC20Upgradeable(poolInfo.lpToken).balanceOf(address(this));
        if (lpSupply == 0) {
            poolInfo.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(poolInfo.lastRewardBlock, block.number);
        uint256 meadReward = multiplier.mul(meadPerBlock);
        poolInfo.accMeadPerShare = poolInfo.accMeadPerShare.add(
            meadReward.mul(1e12).div(lpSupply)
        );
        poolInfo.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to MasterChef for MEAD allocation.
    function deposit(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        updatePool();
        if (user.amount > 0) {
            uint256 pending =
                user.amount.mul(poolInfo.accMeadPerShare).div(1e12).sub(
                    user.rewardDebt
                );
            safeMeadTransfer(msg.sender, pending);
        }
        IERC20Upgradeable(poolInfo.lpToken).safeTransferFrom(
            address(msg.sender),
            address(this),
            _amount
        );
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(poolInfo.accMeadPerShare).div(1e12);
        emit Deposit(msg.sender, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool();
        uint256 pending =
            user.amount.mul(poolInfo.accMeadPerShare).div(1e12).sub(
                user.rewardDebt
            );
        safeMeadTransfer(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(poolInfo.accMeadPerShare).div(1e12);
        IERC20Upgradeable(poolInfo.lpToken).safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        IERC20Upgradeable(poolInfo.lpToken).safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe mead transfer function, just in case if rounding error causes pool to not have enough MEADs.
    function safeMeadTransfer(address _to, uint256 _amount) internal {
        uint256 meadBal = IERC20(mead).balanceOf(address(this));
        if (_amount > meadBal) {
            IERC20(mead).transfer(_to, meadBal);
        } else {
            IERC20(mead).transfer(_to, _amount);
        }
    }
}