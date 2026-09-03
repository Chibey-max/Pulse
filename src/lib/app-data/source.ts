import { liveDataSource } from "./live";
import type { PulseDataSource } from "./types";

/*
  Returns the live testnet data source. Individual live reads/writes validate their
  required endpoint or contract address at call time so route imports never fall
  back to static data and never fail before React can render error states.
*/
export function getDataSource(): PulseDataSource {
  return liveDataSource;
}
