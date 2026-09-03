"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getDataSource } from "./source";

/*
  TanStack Query hooks over the data source. Poll intervals match the PRD's cadence for
  live data; keys are stable so screens sharing a query share a cache entry.
*/

const source = getDataSource();

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: () => source.listMarkets(),
    refetchInterval: 5_000,
  });
}

export function useMarket(marketId: string | undefined) {
  return useQuery({
    queryKey: ["market", marketId],
    queryFn: () => source.getMarket(marketId as string),
    enabled: Boolean(marketId),
    refetchInterval: 5_000,
  });
}

export function useOrderBook(marketId: string | undefined) {
  return useQuery({
    queryKey: ["book", marketId],
    queryFn: () => source.getOrderBook(marketId as string),
    enabled: Boolean(marketId),
    refetchInterval: 4_000,
  });
}

export function usePositions() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["positions", address],
    queryFn: () => source.listPositions(address),
    refetchInterval: 8_000,
  });
}

export function useTape() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["tape", address],
    queryFn: () => source.getTape(address),
    refetchInterval: 15_000,
  });
}

export function useActivity() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["activity", address],
    queryFn: () => source.getActivity(address),
    refetchInterval: 10_000,
  });
}

export function useRedeemable() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["redeemable", address],
    queryFn: () => source.listRedeemable(address),
    refetchInterval: 15_000,
  });
}

export function useSession() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["session", address],
    queryFn: () => source.getSession(address),
    refetchInterval: 8_000,
  });
}
