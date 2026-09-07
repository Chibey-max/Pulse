/*
  Factory carrying the rearm()-capable PulseSession. The previous factory
  (0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84) is still the one named in the published evidence
  trail — it deployed the clone that served the validator redemption — but it has no
  rearm(), so a session that expired or was disarmed there could never be used again and
  its owner could not open another.
*/
export const DEFAULT_SESSION_FACTORY_ADDRESS =
  "0x7c89D4Ab69F3C7e2e29C08B58407a4EBBa1244E4" as const;
export const DEFAULT_MARKET_ADAPTER_ADDRESS = "0x6551503d37f739494534f51D5Bbcb3f90077D4f2" as const;
export const DEFAULT_BINARY_MODULE_ADDRESS = "0x3ecC694Cef705358864a646142ac17A90E29e388" as const;

export const SESSION_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_SESSION_FACTORY ??
  DEFAULT_SESSION_FACTORY_ADDRESS) as `0x${string}`;

export const MARKET_ADAPTER_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_ADAPTER ??
  DEFAULT_MARKET_ADAPTER_ADDRESS) as `0x${string}`;

export const BINARY_MODULE_ADDRESS = (process.env.NEXT_PUBLIC_BINARY_MODULE_ADDRESS ??
  DEFAULT_BINARY_MODULE_ADDRESS) as `0x${string}`;
