// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVRFCoordinatorV2 {
  function requestRandomWords(
    bytes32 keyHash,
    uint64 subId,
    uint16 requestConfirmations,
    uint32 callbackGasLimit,
    uint32 numWords
  ) external returns (uint256);
}