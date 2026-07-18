"use client";
import React, { useMemo, useState } from "react"; // Importing React hooks
import {
  MultiRouteSimulationResult,
  SwapResult,
} from "rango-types/mainApi"; // Import types for the swap logic
import TokenIcon from "../common/token-icon";
import { ChainflipQuote } from "@/app/types/chainflip";
import {
  DEXIFIER_STATE,
  DexifierRoute,
  useDexifier,
} from "@/app/providers/DexifierProvider";
import { RateResponse } from "@/app/types/exolix";
import { RadioGroup } from "@/components/ui/radio-group";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import FloatingTooltip from "../common/floating-tooltip";
import { formatCryptoAmount } from "@/app/utils";
import { Clock, Fuel } from "lucide-react";

const FILTERS = ["Shortest", "Best rate", "Lowest fee", "Fastest"];

// "~45s" / "~3m" / "~1h 20m"; null when the provider gives no estimate
const formatEta = (seconds?: number | null): string | null => {
  if (seconds == null || !isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 90) return `~${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `~${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return `~${h}h${rest ? ` ${rest}m` : ""}`;
};

const formatFeeUsd = (value: number | null): string | null => {
  if (value == null) return null;
  return value >= 0.01 ? `$${value.toFixed(2)}` : `<$0.01`;
};

type RowData = {
  logos: { image: string; alt: string }[];
  title: string;
  isBest?: boolean;
  needsWallet: boolean; // rango routes need a browser wallet; others are wallet-less
  pathText: string;
  receiveAmount: string;
  receiveSymbol: string;
  eta?: string | null;
  fee?: string | null;
};

const RouteCard = () => {
  const { routes, setSelectedRoute, tokenFrom, tokenTo, state, isMobile } =
    useDexifier();
  const [filter, setFilter] = useState<string>("Shortest");

  // Overlapped provider logos (max 3)
  const providerStack = (logos: RowData["logos"]) => (
    <div className="flex -space-x-2.5 shrink-0">
      {logos.slice(0, 3).map((logo, i) => (
        <div
          key={i}
          className="rounded-full border border-white/15 bg-[#0a140d] p-0.5"
        >
          <TokenIcon
            token={{ image: logo.image, alt: logo.alt, className: "size-7" }}
          />
        </div>
      ))}
    </div>
  );

  // Compact, info-dense route row: provider, path, receive amount, ETA, fee
  const routeRow = (row: RowData) => (
    <div className="relative w-full flex items-center gap-3.5">
      {providerStack(row.logos)}
      <div className="flex flex-col min-w-0 gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{row.title}</span>
          {row.isBest && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-black shadow-neon-sm">
              BEST
            </span>
          )}
          <span
            className={cn(
              "rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider",
              row.needsWallet
                ? "border-white/25 text-white/60"
                : "border-primary/40 text-primary"
            )}
          >
            {row.needsWallet ? "Browser" : "Wallet-less"}
          </span>
        </div>
        <span className="text-[11px] text-white/45 truncate tnum">
          {row.pathText}
        </span>
      </div>
      <div className="ms-auto text-right shrink-0">
        <div className="text-base md:text-lg font-bold tnum text-primary leading-tight">
          {row.receiveAmount}{" "}
          <span className="text-xs md:text-sm font-semibold">
            {row.receiveSymbol}
          </span>
        </div>
        {(row.eta || row.fee) && (
          <div className="flex items-center justify-end gap-2.5 text-[11px] text-white/45 tnum">
            {row.eta && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {row.eta}
              </span>
            )}
            {row.fee && (
              <span className="flex items-center gap-1">
                <Fuel size={11} />
                {row.fee}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const rangoRowData = (route: MultiRouteSimulationResult, isBest?: boolean): RowData => {
    const swaps = route.swaps ?? [];
    const first = swaps[0];
    const last = swaps[swaps.length - 1];
    // Unique swappers, in order
    const swappers = swaps.filter(
      (s, i) => swaps.findIndex((x) => x.swapperId === s.swapperId) === i
    );
    const etaSec = swaps.reduce(
      (acc, s: SwapResult) => acc + (s.estimatedTimeInSeconds || 0),
      0
    );
    // Sum fee USD where the fee asset has a known price
    let fee = 0;
    let feeKnown = false;
    for (const s of swaps) {
      for (const f of s.fee ?? []) {
        if (f.price != null) {
          fee += parseFloat(f.amount) * f.price;
          feeKnown = true;
        }
      }
    }
    return {
      logos: swappers.map((s) => ({ image: s.swapperLogo, alt: s.swapperId })),
      title:
        swappers.length === 1
          ? swappers[0].swapperId
          : `${swappers[0].swapperId} +${swappers.length - 1}`,
      isBest,
      needsWallet: true,
      pathText: `${first?.from.symbol ?? ""} → ${last?.to.symbol ?? ""} · ${
        swaps.length
      } step${swaps.length > 1 ? "s" : ""}`,
      receiveAmount: formatCryptoAmount(parseFloat(route.outputAmount)),
      receiveSymbol: last?.to.symbol ?? "",
      eta: formatEta(etaSec),
      fee: formatFeeUsd(feeKnown ? fee : null),
    };
  };

  const chainflipRowData = (route: ChainflipQuote, isBest?: boolean): RowData => {
    const [ingressAsset] = route.ingressAsset.split(".");
    const [egressAsset] = route.egressAsset.split(".");
    const ingress = ingressAsset.toUpperCase();
    const egress = egressAsset.toUpperCase();
    return {
      logos: [{ image: "/assets/chainflip-logo.svg", alt: "Chainflip" }],
      title: "Chainflip",
      isBest,
      needsWallet: false,
      pathText: `${ingress} → ${egress}`,
      receiveAmount: formatCryptoAmount(route.egressAmount),
      receiveSymbol: egress,
      eta: formatEta(route.estimatedDurationSeconds),
      fee: null,
    };
  };

  const exolixRowData = (route: RateResponse, isBest?: boolean): RowData | null => {
    if (!tokenFrom || !tokenTo) return null;
    return {
      logos: [
        { image: "https://exolix.com/favicon/favicon-32x32.png", alt: "Exolix" },
      ],
      title: "Exolix",
      isBest,
      needsWallet: false,
      pathText: `${tokenFrom.symbol} → ${tokenTo.symbol}`,
      receiveAmount: formatCryptoAmount(route.toAmount),
      receiveSymbol: tokenTo.symbol,
      eta: null,
      fee: null,
    };
  };

  function sortRoutesByLayers(routes: DexifierRoute[]) {
    return routes.sort((a, b) => {
      // Check if 'a' is a Quote or RateResponse
      const isAQuoteOrRateResponse = "srcAsset" in a || "rate" in a;
      // Check if 'b' is a Quote or RateResponse
      const isBQuoteOrRateResponse = "srcAsset" in b || "rate" in b;

      // If 'a' is a Quote or RateResponse and 'b' is not, 'a' should come first
      if (isAQuoteOrRateResponse && !isBQuoteOrRateResponse) {
        return -1;
      }
      // If 'b' is a Quote or RateResponse and 'a' is not, 'b' should come first
      if (isBQuoteOrRateResponse && !isAQuoteOrRateResponse) {
        return 1;
      }

      // If both are MultiRouteSimulationResult, sort by the number of swaps
      if ("swaps" in a && "swaps" in b) {
        return a.swaps.length - b.swaps.length;
      }

      // If none of the above conditions are met, maintain the original order
      return 0;
    });
  }

  function sortRoutesByEgress(routes: DexifierRoute[]) {
    // Precompute the sorting value for each route
    const routesWithValues = routes.map((route) => {
      let value: number;
      if ("outputAmount" in route) {
        value = Number(route.outputAmount); // MultiRouteSimulationResult
      } else if ("egressAmount" in route) {
        value = Number(route.egressAmount); // Quote
      } else if ("toAmount" in route) {
        value = route.toAmount; // RateResponse
      } else {
        value = 0; // Fallback (should not happen based on the type definition)
      }
      return { route, value };
    });

    // Sort the routes based on the precomputed values (descending order)
    routesWithValues.sort((a, b) => b.value - a.value);

    // Extract the sorted routes
    return routesWithValues.map((entry) => entry.route);
  }

  function sortRoutesByFee(routes: DexifierRoute[]) {
    // Precompute the sorting value for each route
    const routesWithValues = routes.map((route) => {
      let value: number;
      if ("outputAmount" in route) {
        value =
          route.scores.find((score: any) => score.preferenceType === "FEE")?.score ||
          0; // MultiRouteSimulationResult
      } else if ("egressAmount" in route) {
        value = 0; // Quote
      } else if ("rate" in route) {
        value = 0; // RateResponse
      } else {
        value = 0; // Fallback (should not happen based on the type definition)
      }
      return { route, value };
    });

    // Sort the routes based on the precomputed values (descending order)
    routesWithValues.sort((a, b) => a.value - b.value);

    // Extract the sorted routes
    return routesWithValues.map((entry) => entry.route);
  }

  function sortRoutesByTime(routes: DexifierRoute[]) {
    // Precompute the sorting value for each route
    const routesWithValues = routes.map((route) => {
      let value: number;
      if ("outputAmount" in route) {
        value =
          route.scores.find((score: any) => score.preferenceType === "SPEED")
            ?.score || 0; // MultiRouteSimulationResult
      } else if ("egressAmount" in route) {
        value = 0; // Quote
      } else if ("rate" in route) {
        value = 0; // RateResponse
      } else {
        value = 0; // Fallback (should not happen based on the type definition)
      }
      return { route, value };
    });

    // Sort the routes based on the precomputed values (descending order)
    routesWithValues.sort((a, b) => a.value - b.value);

    // Extract the sorted routes
    return routesWithValues.map((entry) => entry.route);
  }

  const sortedRoutes = useMemo(() => {
    if (routes)
      switch (filter) {
        case "Shortest":
          return sortRoutesByLayers(routes);
        case "Best rate":
          return sortRoutesByEgress(routes);
        case "Lowest fee":
          return sortRoutesByFee(routes);
        case "Fastest":
          return sortRoutesByTime(routes);
        default:
          break;
      }
  }, [routes, filter]);

  return (
    <Card
      className={cn(
        "h-full flex flex-col w-full rounded-[28px] border border-primary/25 bg-white/[0.07] backdrop-blur-2xl backdrop-saturate-150 neon-frame animate-rise text-white",
        isMobile ? "p-5 border-none bg-transparent shadow-none backdrop-blur-none before:hidden" : "max-w-[650px] p-6"
      )}
    >
      <CardHeader className="md:p-4 py-4 px-0">
        <div className="h-auto bg-transparent flex w-full justify-between gap-4">
          <CardTitle className="font-display text-2xl font-bold uppercase tracking-[0.2em] text-glow">
            Routes
          </CardTitle>
          <RadioGroup
            defaultValue={FILTERS[0]}
            onValueChange={(value) => setFilter(value)}
            className="flex items-center overflow-x-scroll"
          >
            {FILTERS.map((filter) => (
              <RadioGroupPrimitive.Item
                value={filter}
                id={filter}
                key={filter}
                className="rounded-full border border-white/15 px-3 py-1 text-nowrap text-xs text-white/70 transition duration-300 hover:border-primary/50 hover:text-white data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:font-semibold data-[state=checked]:text-black data-[state=checked]:shadow-neon-sm"
              >
                {filter}
              </RadioGroupPrimitive.Item>
            ))}
          </RadioGroup>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto p-0 pe-1 flex-1">
        {state === DEXIFIER_STATE.FETCHING_ROUTES ? (
          [0, 1].map((val) => (
            <Skeleton
              className="h-[84px] w-full rounded-2xl p-4 mb-2 bg-white/5"
              key={val}
            >
              <div className="flex items-center gap-3.5">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="w-24 h-3 rounded-md" />
                  <Skeleton className="w-32 h-2 rounded-md" />
                </div>
                <div className="ms-auto flex flex-col items-end gap-2">
                  <Skeleton className="w-20 h-4 rounded-md" />
                  <Skeleton className="w-14 h-2 rounded-md" />
                </div>
              </div>
            </Skeleton>
          ))
        ) : (
          <div className="overflow-auto size-full">
            {sortedRoutes && sortedRoutes.length ? (
              <RadioGroup
                defaultValue="0"
                onValueChange={(value) =>
                  setSelectedRoute(sortedRoutes[parseInt(value)])
                }
                className="w-full h-full space-y-2"
              >
                {sortedRoutes.map((route, index) => {
                  const row: RowData | null =
                    "outputAmount" in route
                      ? rangoRowData(route, index === 0)
                      : "egressAmount" in route
                        ? chainflipRowData(route, index === 0)
                        : "toAmount" in route
                          ? exolixRowData(route, index === 0)
                          : null;
                  if (!row) return null;
                  return (
                    <FloatingTooltip
                      key={index}
                      description={
                        row.needsWallet
                          ? "Browser wallet connection needed"
                          : "No wallet connection needed"
                      }
                    >
                      <RadioGroupPrimitive.Item
                        value={index.toString()}
                        id={index.toString()}
                        key={index}
                        style={{ animationDelay: `${index * 70}ms` }}
                        className="route-row-enter w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition duration-300 hover:border-primary/40 hover:bg-primary/5 data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:shadow-neon"
                      >
                        {routeRow(row)}
                      </RadioGroupPrimitive.Item>
                    </FloatingTooltip>
                  );
                })}
              </RadioGroup>
            ) : (
              <div className="flex flex-col h-full text-center justify-center text-primary">
                <span className="text-6xl">⚠</span>
                <br />
                <span className="text-base">No available route found</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RouteCard;
