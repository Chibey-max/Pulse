// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/*
 * The callback Somnia's Reactivity precompile invokes on a subscribed handler.
 *
 * The signature must match the protocol's exactly — `@somnia-chain/reactivity`
 * exports it as `SomniaEventHandlerABI`, and its selector is 0x53edf33d. An
 * `onEvent(bytes)` handler (selector 0x0bde80f3) compiles and deploys happily,
 * accepts a subscription, and then never fires: the callback either fails the
 * interface check or reverts decoding three arguments into one, and a reverted
 * callback emits nothing. There is no on-chain trace to debug against, so the
 * only symptom is silence.
 */
interface ISomniaEventHandler {
    function onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data) external;
}
