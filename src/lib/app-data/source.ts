import { IS_MOCK } from "./config";
import { liveDataSource } from "./live";
import { mockDataSource } from "./mock";
import type { PulseDataSource } from "./types";

/*
  Returns the data source the app reads from. Mock by default and whenever the live
  endpoints are not configured (see config.ts). The live source (markets + book) is
  read-only; positions / session / tape stay empty until PulseSessionFactory is deployed.
*/
export function getDataSource(): PulseDataSource {
  return IS_MOCK ? mockDataSource : liveDataSource;
}
