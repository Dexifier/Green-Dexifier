"use client";
// This component displays the details of a swap transaction, including the tokens involved, swap status, and swap steps.
// Steps are rendered as a vertical neon timeline: pending -> running -> done/error.
import Image from "next/image";
import Link from "next/link";
import { cancelSwap } from "@rango-dev/queue-manager-rango-preset";
import { FC, useEffect, useState } from "react";
import { PendingSwap } from "rango-types";
import { useManager } from "@rango-dev/queue-manager-react";
import ButtonCopyIcon from "../common/coyp-button-icon";
import TooltipTemplate from "../common/tooltip-template";
import { ConfirmRouteResponse, MultiRouteSimulationResult, SwapResult } from "rango-types/mainApi";
import { getSwapMessages, getSwapDate, getStepState, getPendingSwaps } from "@/app/utils/swap";
import TokenIcon from "../common/token-icon";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDexifier } from "@/app/providers/DexifierProvider";
import { useNotification } from "@/app/providers/NotificationProvider";
import { useWidget } from "@rango-dev/widget-embedded";
import { formatCryptoAmount } from "@/app/utils";
import { ArrowRight, Check, Loader2, TriangleAlert, X } from "lucide-react";

interface SwapTokenProps {
  swapData: SwapResult, // Data related to the token being swapped
  isFrom: boolean, // Flag indicating if it's the 'from' token
  className?: string
}

interface StepStateProps {
  swap: PendingSwap | undefined, // Pending swap data
  currentStep: number // Current step of the swap process
}

type StepState = "default" | "in-progress" | "completed" | "error" | "warning" | undefined;

type RangoData = {
  swapData: ConfirmRouteResponse;
  selectedRoute: MultiRouteSimulationResult;
};


const DexifierDetailRango = () => {
  const { manager } = useManager(); // Manager from the Rango queue

  const { selectedRoute, swapData } = useDexifier() as RangoData;
  const { initialize } = useDexifier();
  const swaps = selectedRoute.swaps; // List of swaps involved in the current route
  const pendingSwaps = getPendingSwaps(manager); // Fetch pending swaps from the manager
  const { notify } = useNotification();

  const selectedSwap = swapData.result?.requestId
    ? pendingSwaps.find(({ swap }) => swap.requestId === swapData.result?.requestId)
    : undefined;
  const pendingSwap = selectedSwap?.swap; // Get the selected swap from the pending swaps

  // Refresh balances app-wide (navbar, card, wallet details) once a swap
  // reaches a terminal state, and notify success/failure correctly.
  const { wallets } = useWidget();
  const { details: connectedWallets, refetch: refetchBalances } = wallets;

  useEffect(() => {
    if (!pendingSwap) return;
    if (pendingSwap.status !== "success" && pendingSwap.status !== "failed") return;
    if (connectedWallets.length) refetchBalances(connectedWallets);
    const steps = pendingSwap.simulationResult.swaps;
    const tokenFrom = steps[0]?.from;
    const tokenTo = steps[steps.length - 1]?.to;
    const amountFrom = formatCryptoAmount(Number(pendingSwap.inputAmount));
    const amountTo = formatCryptoAmount(Number(pendingSwap.simulationResult.outputAmount));
    notify(pendingSwap.status === "success" ? 'Swap completed!' : 'Swap failed', {
      body: `${tokenFrom?.blockchain} ${amountFrom} ${tokenFrom?.symbol} -> ${tokenTo?.blockchain} ${amountTo} ${tokenTo?.symbol}`,
      icon: '/assets/logo.png',
    })
  }, [pendingSwap?.status])

  // Handle canceling the swap
  const onCancel = () => {
    if (selectedSwap && manager) {
      const swap = manager.get(selectedSwap.id);
      if (swap) {
        cancelSwap(swap);
        initialize();
      }
    }
  };

  // Handle deleting the swap
  const onDelete = async () => {
    if (selectedSwap && manager) {
      manager.deleteQueue(selectedSwap.id);
      initialize();
    }
  };

  // Fetch the message for a particular step of the swap process
  const getMessage = (index: number) => {
    if (!pendingSwap) return;
    const currentStep = pendingSwap.steps[index];
    const stepMessage = getSwapMessages(pendingSwap, currentStep); // Get message for the current step
    const stepDetailMessage = stepMessage.detailedMessage.content || stepMessage.shortMessage;
    return stepDetailMessage;
  };

  // Component to display the step message of the swap
  const StepMessage: FC<StepStateProps> = ({ swap, currentStep }) => {
    const [message, setMessage] = useState<string>();

    useEffect(() => {
      if (swap !== undefined) {
        const state = getStepState(swap.steps[currentStep]); // Get the state of the current step
        if (state !== "default") {
          setMessage(getMessage(currentStep)); // Set the message for the step
        }
      }
    }, [swap, currentStep]);

    if (swap === undefined || !message) {
      return null;
    }

    return (
      <p className="mt-1.5 text-xs text-white/50 leading-relaxed">
        {message.replace('Rango', 'Dexifier')}
      </p>
    );
  };

  // Timeline node: numbered circle that becomes a spinner / check / cross
  const StepNode = ({ state, index }: { state: StepState; index: number }) => (
    <div
      className={cn(
        "relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500",
        state === "completed" && "border-primary bg-primary text-black shadow-neon-sm",
        state === "in-progress" && "border-primary bg-primary/15 text-primary shadow-neon-sm",
        state === "error" && "border-red-500 bg-red-500/15 text-red-400",
        state === "warning" && "border-yellow-500 bg-yellow-500/15 text-yellow-400",
        (state === "default" || !state) && "border-white/15 bg-white/5 text-white/40"
      )}
    >
      {state === "completed" ? (
        <Check size={14} strokeWidth={3} />
      ) : state === "in-progress" ? (
        <Loader2 size={14} className="animate-spin" />
      ) : state === "error" ? (
        <X size={14} strokeWidth={3} />
      ) : state === "warning" ? (
        <TriangleAlert size={13} />
      ) : (
        <span className="text-[11px] font-bold tnum">{index + 1}</span>
      )}
    </div>
  );

  const statePill = (state: StepState) => {
    if (!state || state === "default") {
      return (
        <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Waiting
        </span>
      );
    }
    if (state === "in-progress") {
      return (
        <span className="rounded-full border border-primary/60 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary shadow-neon-sm">
          Running
        </span>
      );
    }
    if (state === "completed") {
      return (
        <span className="rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
          Done
        </span>
      );
    }
    if (state === "warning") {
      return (
        <span className="rounded-full border border-yellow-500/60 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
          Warning
        </span>
      );
    }
    return (
      <span className="rounded-full border border-red-500/60 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
        Failed
      </span>
    );
  };

  return selectedRoute && (
    <Card className="max-w-[650px] min-h-[540px] w-full h-full rounded-[28px] border border-primary/25 bg-white/[0.07] backdrop-blur-2xl backdrop-saturate-150 neon-frame animate-rise p-2 text-white">
      <CardHeader className="flex flex-row justify-between items-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.2em] text-glow">
          Swap Details
        </h1>
        <button
          className="text-xs font-semibold uppercase tracking-wider text-red-400/80 transition hover:text-red-400 disabled:opacity-40"
          onClick={onDelete}
          disabled={!selectedSwap?.id}
        >
          Delete
        </button>
      </CardHeader>
      <CardContent className="overflow-auto h-[380px] px-6">
        <div className="mb-8">
          {pendingSwap && <div className="flex justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/50">
              {`${pendingSwap.finishTime ? "Finished at" : "Created at"}:`}
            </span>
            <span className="text-sm text-white/50 tnum">
              {getSwapDate(pendingSwap)}
            </span>
          </div>}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/50">Requested ID:</span>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-white/50 tnum">
              {selectedRoute.requestId.length > 40 ? (
                <>{selectedRoute.requestId.slice(0, 40)}...</>
              ) : (
                selectedRoute.requestId
              )}
            </span>
              <ButtonCopyIcon text={selectedRoute.requestId} />
              <Link href={`https://explorer.dexifier.com/swap/${selectedRoute.requestId}`} target="_blank">
                <Image src={"/assets/icons/search-list.png"} width={22} height={22} alt="explorer" />
              </Link>
            </div>
          </div>
        </div>

        {(swapData as ConfirmRouteResponse).result && swaps && <div className="mb-7 flex flex-col items-center text-xs">
          <div className="flex gap-1 w-full items-center">
            <SwapToken swapData={swaps[0]} isFrom={true} />
            <div className="relative border-t border-white/20 min-w-24 flex-grow mt-8">
              {swaps && swaps.map((swap, index) => {
                const percentage = ((index + 1) / (swaps.length + 1)) * 100; // Calculate percentage for left
                return (
                  <div
                    key={index}
                    className="absolute top-[-12px]"
                    style={{
                      left: `${percentage}%`,
                      transform: 'translateX(-50%)', // Center each element on its left position
                    }}
                  >
                    <TooltipTemplate content={swap.swapperId}>
                      <Image src={swap.swapperLogo} width={25} height={25} alt="swapLogo" className="rounded-full" />
                    </TooltipTemplate>
                  </div>
                );
              })}
            </div>
            <SwapToken swapData={swaps[swaps.length - 1]} isFrom={false} />
          </div>

          {/* Vertical neon timeline of swap steps */}
          <div className="w-full mt-8 mb-4">
            <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white/70">
              Swap Steps
            </span>
          </div>
          <div className="w-full">
            {swaps && swaps.map((swap, index) => {
              const state: StepState = pendingSwap
                ? (getStepState(pendingSwap.steps[index]) as StepState)
                : "default";
              const isLast = index === swaps.length - 1;
              return (
                <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* connecting rail */}
                  {!isLast && (
                    <div
                      className={cn(
                        "absolute left-[13px] top-8 bottom-0 w-px transition-colors duration-500",
                        state === "completed"
                          ? "bg-gradient-to-b from-primary/70 to-primary/20"
                          : "bg-white/10"
                      )}
                    />
                  )}
                  <StepNode state={state} index={index} />
                  <div className="flex-1 min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 text-sm">
                        <TokenIcon
                          token={{ image: swap.from.logo, alt: swap.from.symbol, className: "size-6" }}
                          blockchain={{ image: swap.from.blockchainLogo, alt: swap.from.blockchain, className: "size-3" }}
                        />
                        <span className="tnum font-semibold">{formatCryptoAmount(parseFloat(swap.fromAmount))}</span>
                        <span className="text-white/60">{swap.from.symbol}</span>
                        <ArrowRight size={14} className="text-primary shrink-0" />
                        <TokenIcon
                          token={{ image: swap.to.logo, alt: swap.to.symbol, className: "size-6" }}
                          blockchain={{ image: swap.to.blockchainLogo, alt: swap.to.blockchain, className: "size-3" }}
                        />
                        <span className="tnum font-semibold">{formatCryptoAmount(parseFloat(swap.toAmount))}</span>
                        <span className="text-white/60">{swap.to.symbol}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <TooltipTemplate content={swap.swapperId}>
                          <TokenIcon token={{ image: swap.swapperLogo, alt: swap.swapperId, className: "size-5" }} />
                        </TooltipTemplate>
                        {statePill(state)}
                      </div>
                    </div>
                    {swap && <StepMessage swap={pendingSwap} currentStep={index} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
      </CardContent>
      <CardFooter>
        <Button
          className={cn('h-12 mx-auto')}
          variant="outline"
          onClick={onCancel}
          disabled={pendingSwap?.status === "running"}
        >
          {pendingSwap?.status === "success" ? "Swap again" : "Cancel"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Component to display token details for the swap
const SwapToken: FC<SwapTokenProps> = ({ className, swapData, isFrom }) => {
  return (
    <div className={`${className} flex flex-col items-center`}>
      <div className="size-16 p-2 border border-primary/30 rounded-full bg-white/5">
        <TokenIcon
          token={{
            image: swapData[isFrom ? "from" : "to"].logo,
            alt: swapData[isFrom ? "from" : "to"].symbol,
          }}
          blockchain={{
            image: swapData[isFrom ? "from" : "to"].blockchainLogo,
            alt: swapData[isFrom ? "from" : "to"].blockchain,
            className: "size-6",
          }}
        />
      </div>
      <span className="text-xs tnum">
        {formatCryptoAmount(parseFloat(swapData[isFrom ? "fromAmount" : "toAmount"]))}
      </span>
      <span className="text-sm">
        {swapData[isFrom ? "from" : "to"].symbol}
      </span>
    </div>
  );
};

export default DexifierDetailRango;
