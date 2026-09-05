// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { PulseSessionFactory } from "../contracts/PulseSessionFactory.sol";

/*
 * Redeploys only the session factory (and, via its constructor, a fresh PulseSession
 * implementation) against the EXISTING collateral + market adapter. Use this instead of
 * DeployPulseSessionFactory.s.sol when only PulseSession.sol changed — reusing the live
 * adapter keeps its `held` bookkeeping intact, so open positions tracked by the current
 * adapter (e.g. an unclaimed win) stay reachable after the factory swap.
 */
contract DeployPulseSessionFactoryOnly is Script {
    function run() external returns (PulseSessionFactory factory) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address collateral = vm.envAddress("COLLATERAL_ADDRESS");
        address marketAdapter =
            vm.envOr("MARKET_ADAPTER_ADDRESS", vm.envAddress("NEXT_PUBLIC_MARKET_ADAPTER"));

        vm.startBroadcast(privateKey);
        factory = new PulseSessionFactory(collateral, marketAdapter);
        vm.stopBroadcast();

        console2.log("NEXT_PUBLIC_SESSION_FACTORY=%s", address(factory));
    }
}
