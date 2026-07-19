"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import ButtonCopyIcon from "../common/coyp-button-icon";
import StatusBar from "../common/status-bar";
import CustomLoader from "../common/loader";
import QrCodeGenerator from "../common/qr-generator";
import TooltipTemplate from "../common/tooltip-template";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatReadableDate } from "@/app/utils";
import TokenIcon from "../common/token-icon";
import {
  DEXIFIER_STATE,
  useDexifier,
} from "@/app/providers/DexifierProvider";
import { ChainflipError, ChainflipSwapStatus } from "@/app/types/chainflip";
import { ExTxInfo, TxRequest } from "@/app/types/exolix";
import { toastError } from "@/lib/utils";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { SWAP_SUCCESS_EVENT } from "../common/swap-success-overlay";

const AddressesCard = () => {
  const {
    selectedRoute,
    setSwapData,
    swapData,
    swapStatus,
    tokenFrom,
    tokenTo,
    amountFrom,
    amountTo,
    settings,
    isMobile,
    createSwap,
    withdrawalAddress,
    setWithdrawalAddress,
    refundAddress,
    setRefundAddress,
    state,
  } = useDexifier();
  // const { selectedQuote, srcAsset, destAsset, depositData } = useQuote();
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  // const [isLoading, setIsLoading] = useState<boolean>(false);
  const status = useMemo(() => {
    if (swapStatus) {
      if ("state" in swapStatus) {
        return {
          id: swapStatus.swapId,
          amountFrom: amountFrom,
          amountTo: amountTo,
          createdAt: swapStatus.depositChannel?.createdAt,
          status: swapStatus.state,
          depositAddress: swapStatus.depositChannel?.depositAddress,
        };
      }
      if ("status" in swapStatus) {
        return {
          id: swapStatus.id,
          amountFrom: amountFrom,
          amountTo: amountTo,
          createdAt: swapStatus.createdAt,
          status: swapStatus.status,
          depositAddress: swapStatus.depositAddress,
        };
      }
    }
  }, [swapStatus]);

  // Celebrate when a wallet-less swap reaches a terminal success state (once per swap)
  const celebratedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!status) return;
    const terminalSuccess = status.status === "COMPLETED" || status.status === "success";
    if (!terminalSuccess) return;
    const key = String(status.id ?? "unknown");
    if (celebratedRef.current === key) return;
    celebratedRef.current = key;
    window.dispatchEvent(new CustomEvent(SWAP_SUCCESS_EVENT));
  }, [status?.status]);

  async function pasteFromClipboard(setFunc: React.Dispatch<React.SetStateAction<string>>) {
    try {
      if (navigator.clipboard) {
        const clipboardText = await navigator.clipboard.readText();
        setFunc(clipboardText);
      } else {
        console.error("Clipboard API not supported.");
      }
    } catch (error) {
      console.error("Failed to read from clipboard:", error);
    }
  }

  // useEffect(() => {
  //   if (!swapStatus) setIsLoading(false);
  // }, [swapStatus]);

  // useEffect(() => {
  //   if (!txData) return
  //   if (txData.status === "confirmation") {
  //     setCurrentStep(0);
  //     setSteps(['confirmation', `${txData.coinFrom.coinCode} to ${txData.coinTo.coinCode}`, 'Sending'])
  //     return
  //   }
  //   if (txData.status === "confirmed" || txData.status === "exchanging") {
  //     setCurrentStep(1);
  //     setSteps(['Confirmed', `${txData.coinFrom.coinCode} to ${txData.coinTo.coinCode}`, 'Sending'])
  //     return
  //   }
  //   if (txData.status === "sending") {
  //     setCurrentStep(2);
  //     setSteps(['Confirmed', `${txData.coinFrom.coinCode} to ${txData.coinTo.coinCode}`, `${txData.status}`])
  //     return
  //   }
  //   if (txData.status === "success" || txData.status === "refunded") {
  //     setCurrentStep(3);
  //     setSteps(['Confirmed', `${txData.coinFrom.coinCode} to ${txData.coinTo.coinCode}`, `${txData.status}`])
  //     return
  //   }
  // }, [txData])
  const renderExolixStatus = (state: ExTxInfo["status"]) => {
    const exolixStatus = swapStatus as ExTxInfo;
    switch (state) {
      case "wait":
        return (
          <div className="flex flex-col items-center text-primary">
            <CustomLoader />
            <span className="text-white">
              Waiting to receive funds
            </span>
          </div>
        );
      case "confirmation":
        return (
          <StatusBar
            steps={[
              "confirmation",
              `${exolixStatus.coinFrom.coinCode} to ${exolixStatus.coinTo.coinCode}`,
              "Sending",
            ]}
            currentStep={0}
          />
        );
      case "confirmed":
      case "exchanging":
        return (
          <StatusBar
            steps={[
              "Confirmed",
              `${exolixStatus.coinFrom.coinCode} to ${exolixStatus.coinTo.coinCode}`,
              "Sending",
            ]}
            currentStep={1}
          />
        );
      case "sending":
        return (
          <StatusBar
            steps={[
              "Confirmed",
              `${exolixStatus.coinFrom.coinCode} to ${exolixStatus.coinTo.coinCode}`,
              `${exolixStatus.status}`,
            ]}
            currentStep={2}
          />
        );
      case "success":
        return (
          <div className="flex flex-col items-center text-primary">
            <StatusBar steps={steps} currentStep={currentStep} />
            <span>Transaction is completed and funds are received</span>
          </div>
        );
      case "refunded":
        return;
      case "overdue":
        return <span>Transation is overdue</span>;
      default:
        return (
          <>
            <CustomLoader />
            <span className="text-white">
              Waiting to receive funds
            </span>
          </>
        );
    }
  };

  // Human-readable labels for provider status codes
const humanStatus = (raw?: string): string => {
  if (!raw) return "\u2014";
  const map: Record<string, string> = {
    wait: "Waiting for deposit",
    confirmation: "Confirming",
    confirmed: "Confirmed",
    exchanging: "Exchanging",
    sending: "Sending",
    success: "Completed",
    failed: "Failed",
    refunded: "Refunded",
    overdue: "Expired",
    RECEIVING: "Waiting for deposit",
    SWAPPING: "Swapping",
    SENDING: "Sending",
    SENT: "Sent",
    COMPLETED: "Completed",
    FAILED: "Failed",
  };
  return map[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const renderChainflipStatus = (state: string) => {
    const chainflipStatus = swapStatus as ChainflipSwapStatus;
    switch (state) {
      case "RECEIVING":
        return (
          <>
            <StatusBar
              steps={[
                `Depositing ${chainflipStatus.sourceAsset}`,
                `${chainflipStatus.sourceAsset} to ${chainflipStatus.destinationAsset}`,
              ]}
              currentStep={0}
            />
            Receiving funds
          </>
        );
      case "SWAPPING":
        return (
          <>
            <StatusBar
              steps={[
                `${chainflipStatus.sourceAsset} to ${chainflipStatus.destinationAsset}`,
                `Withdrawing ${chainflipStatus.destinationAsset}`,
              ]}
              currentStep={0}
            />
            Swapping assets
          </>
        );
      case "SENDING":
        return (
          <>
            <StatusBar
              steps={[`Withdrawing ${chainflipStatus.destinationAsset}`, "Finishing"]}
              currentStep={0}
            />
            Withdrawing funds
          </>
        );
      case "SENT":
        return (
          <>
            <StatusBar
              steps={[`Withdrawing ${chainflipStatus.destinationAsset}`, "Finishing"]}
              currentStep={1}
            />
            Withdraw succeed
          </>
        );
      case "COMPLETED":
        return (
          <>
            <StatusBar
              steps={[`Withdrawing ${chainflipStatus.destinationAsset}`, "Finishing"]}
              currentStep={2}
            />
            Transaction is completed and funds are received
          </>
        );
      case "FAILED":
        return <span>Transaction is failed</span>;
      default:
        if (chainflipStatus.depositChannel?.isExpired === true) {
          return <span>Transation is overdue</span>;
        }
        return (
          <>
            <CustomLoader />
            <span className="text-white">
              Waiting to receive funds
            </span>
          </>
        );
    }
  };

  return (
    <Card className="flex flex-col max-w-[650px] md:min-h-[540px] w-full h-full bg-white/[0.07] backdrop-blur-2xl backdrop-saturate-150 md:p-6 rounded-[28px] border border-primary/25 md:neon-frame animate-rise text-white">
      <CardHeader className="md:p-4 md:pt-0 px-4 pt-6">
        <CardTitle className="md:text-2xl text-lg font-display font-bold uppercase tracking-[0.15em] text-glow">
          {swapStatus ? (
            <span className="text-primary uppercase">
              Confirming Transaction
            </span>
          ) : (
            "Addresses"
          )}
        </CardTitle>
      </CardHeader>
      <Separator className="bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block hidden" />
      <CardContent className="flex flex-col md:px-6 md:pb-0 p-4 overflow-y-auto overflow-x-hidden flex-1">
        <div className="flex w-full md:justify-center items-center justify-center flex-wrap gap-x-3 gap-y-1.5 md:my-4 mb-6 md:text-lg text-sm font-bold tnum bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
          {tokenFrom && (
            <>
              <TokenIcon
                token={{
                  image: tokenFrom.image,
                  alt: tokenFrom.symbol,
                  className: "md:size-12 size-[27px]",
                }}
              />
              <div className="flex items-center gap-1 md:gap-2 min-w-0">
                <span>{Number(amountFrom).toFixed(2)}</span>
                <span>{tokenFrom.symbol}</span>
                <span className="text-opacity-80 md:block hidden">
                  [{tokenFrom.blockchain}]
                </span>
              </div>
            </>
          )}
          <ArrowRight className="text-primary md:size-7 size-5 shrink-0" />
          {tokenTo && (
            <>
              <TokenIcon
                token={{
                  image: tokenTo.image,
                  alt: tokenTo.symbol,
                  className: "md:size-12 size-[27px]",
                }}
              />
              <div className="flex items-center gap-1 md:gap-2 min-w-0">
                <span>{Number(amountTo).toFixed(2)}</span>
                <span>{tokenTo.symbol}</span>
                <span className="text-opacity-80 md:block hidden">
                  [{tokenTo.blockchain}]
                </span>
              </div>
            </>
          )}
        </div>
        <div>
          <Label
            htmlFor="withdrawal"
            className="text-sm font-medium uppercase tracking-wider text-white/50"
          >
            Recipient{" "}
            <span className="text-primary">
              {tokenTo?.blockchain} {tokenTo?.symbol}
            </span>{" "}
            address
            <TooltipTemplate content="Enter the address that will RECEIVE the funds.">
              <Info className="ms-1.5 inline size-3.5 -translate-y-px cursor-help text-white/40 transition-colors hover:text-primary" />
            </TooltipTemplate>
          </Label>
          <div
            id="withdrawal"
            className={`${withdrawalAddress ? "border-white/10" : "border-primary/60"
              } flex items-center justify-between rounded-2xl border p-3 max-h-[3.3125rem] my-3 bg-black/40 transition duration-300 hover:border-white/20 focus-within:border-primary/60 focus-within:shadow-neon-sm`}
          >
            <Input
              type="text"
              value={withdrawalAddress}
              onChange={(e) => setWithdrawalAddress(e.target.value)}
              placeholder="Enter receiving address"
              className="md:text-base text-xs placeholder:text-white/50 md:px-3 px-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={!!swapStatus}
            />
            <Button
              className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/25 border-none h-full"
              disabled={!!swapStatus}
              onClick={() => pasteFromClipboard(setWithdrawalAddress)}
            >
              paste
            </Button>
          </div>


          <Label
            htmlFor="refund"
            className="text-sm font-medium uppercase tracking-wider text-white/50"
          >
            Refund{" "}
            <span className="text-primary">
              {tokenFrom?.blockchain} {tokenFrom?.symbol}
            </span>{" "}
            address
            <TooltipTemplate content="Enter the address that we will send the funds to in case of swap failure.">
              <Info className="ms-1.5 inline size-3.5 -translate-y-px cursor-help text-white/40 transition-colors hover:text-primary" />
            </TooltipTemplate>
          </Label>
          <div
            id="refund"
            className={`${refundAddress ? "border-white/10" : "border-primary/60"
              } flex items-center justify-between rounded-2xl border p-3 max-h-[3.3125rem] my-3 bg-black/40 transition duration-300 hover:border-white/20 focus-within:border-primary/60 focus-within:shadow-neon-sm`}
          >
            <Input
              type="text"
              value={refundAddress}
              onChange={(e) => setRefundAddress(e.target.value)}
              placeholder="Enter refund address"
              className="md:text-base text-xs placeholder:text-white/50 md:px-3 px-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={!!swapStatus}
            />
            <Button
              className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/25 border-none h-full"
              disabled={!!swapStatus}
              onClick={() => pasteFromClipboard(setRefundAddress)}
            >
              paste
            </Button>
          </div>

          {status && (
            <div className="w-full max-w-md md:mx-auto mb-4 mt-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Created
                </span>
                <span className="tnum text-sm text-white/85 text-right">
                  {formatReadableDate(new Date(status.createdAt || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Transaction ID
                </span>
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="tnum text-sm text-white/85 truncate">{status.id}</span>
                  <ButtonCopyIcon text={status.id} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Status
                </span>
                <span className="text-sm text-white/85">{humanStatus(status.status)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="my-2">
          {/* {txData && <div>
            <Label htmlFor="deposit" className="text-sm font-medium uppercase tracking-wider text-white/50">Deposit <span className="text-primary">{tokenFrom?.blockchain} <span className="md:hidden">{'('}</span>{tokenFrom?.symbol}<span className="md:hidden">{')'}</span></span> address</Label>
            <div id="deposit" className={`${txData.depositAddress ? "border-primary/40" : "border-[#695F5F]"} border flex items-center justify-between rounded-lg md:p-3 p-2 shadow-md max-h-[3.3125rem] md:my-3 mt-1 mb-3 bg-transparent`}>
              <Input
                type='text'
                value={txData.depositAddress || ""}
                className="md:text-primary text-white md:text-base text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 md:px-3 px-1"
                readOnly={true}
              />
              {txData.depositAddress && <><QrCodeGenerator text={txData.depositAddress} /> <ButtonCopyIcon text={txData.depositAddress} /></>}
            </div>
            {txData.status === "wait" ? <div className="flex flex-col items-center text-primary"><CustomLoader /><span className="text-white">Waiting to receive funds</span></div> :
              txData.status === "success" ? <div className="flex flex-col items-center text-primary"><StatusBar steps={steps} currentStep={currentStep} /><span>Transaction is completed and funds are received</span></div> :
                txData.status === "overdue" ? <div className="flex justify-center"><span >Transation is overdue</span></div> :
                  <StatusBar steps={steps} currentStep={currentStep} />}
          </div>} */}
          {status && (
            <div>
              <Label
                htmlFor="deposit"
                className="text-sm font-medium uppercase tracking-wider text-white/50"
              >
                Deposit{" "}
                <span className="text-primary">
                  {tokenFrom?.blockchain}{" "}
                  <span className="md:hidden">{"("}</span>
                  {tokenFrom?.symbol}
                  <span className="md:hidden">{")"}</span>
                </span>{" "}
                address
              </Label>
              <div
                id="deposit"
                className={`${status.depositAddress
                  ? "border-primary/60 shadow-neon-sm"
                  : "border-white/10"
                  } flex items-center justify-between rounded-2xl border p-3 max-h-[3.3125rem] md:my-3 mt-1 mb-3 bg-black/40 transition duration-300`}
              >
                <Input
                  type="text"
                  value={status.depositAddress}
                  className="md:text-primary text-white md:text-base text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 md:px-3 px-1"
                  readOnly={true}
                />
                {status.depositAddress && (
                  <>
                    <QrCodeGenerator text={status.depositAddress} />{" "}
                    <ButtonCopyIcon text={status.depositAddress} />
                  </>
                )}
              </div>
              {selectedRoute &&
                <div className="flex flex-col items-center text-primary">
                  {'egressAmount' in selectedRoute &&
                    renderChainflipStatus(
                      status.status as string
                    )}
                  {'toAmount' in selectedRoute &&
                    renderExolixStatus(status.status as ExTxInfo["status"])}
                </div>
              }
            </div>
          )}
        </div>
      </CardContent>
      {!swapStatus && selectedRoute && (
        <CardFooter className={`${isMobile && 'hidden'}`}>
          <Button
            disabled={state === DEXIFIER_STATE.PENDING || !withdrawalAddress}
            className={`btn-sheen w-full h-14 text-xl font-extrabold uppercase tracking-widest mx-auto`}
            variant={"neon"}
            onClick={async () => {
              try {
                await createSwap();
              } catch (error) {
                if (error instanceof Error) {
                  toastError(error.message);
                } else {
                  toastError("An error occurred during swap creation");
                }
              }
            }}
          >
            {state === DEXIFIER_STATE.PENDING ? <Loader2 className="animate-spin text-primary" /> : 'Start'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default AddressesCard;
