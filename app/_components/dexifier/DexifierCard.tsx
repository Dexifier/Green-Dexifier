"use client";

import Image from "next/image";
import React, { ChangeEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWidget } from "@rango-dev/widget-embedded";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DEXIFIER_STATE,
  useDexifier,
} from "@/app/providers/DexifierProvider";
import TokenInput from "./TokenInput";
import WalletConnectModal from "./WalletConnectModal";
import ConfirmModal from "./ConfirmModal";
import TooltipTemplate from "../common/tooltip-template";
import SettingModal from "./SettingModal";
import { cn } from "@/lib/utils";
import { formatCryptoAmount } from "@/app/utils";
import { ArrowDownUp } from "lucide-react";

const DexifierCard: React.FC = () => {
  // Use custom hook to get connected wallet details
  const { wallets } = useWidget();
  const { details: connectedWallets } = wallets;
  const isWalletConnected = connectedWallets.length > 0;

  // Swap state management from the DexifierProvider context
  const {
    tokenFrom,
    setTokenFrom,
    tokenTo,
    setTokenTo,
    amountFrom,
    setAmountFrom,
    amountTo,
    selectedRoute,
    swapData,
    isMobile,
    state,
    setState,
    initialize,
  } = useDexifier();
  const [tokenFromBalance, setTokenFromBalance] = useState<number>(0);

  // Update tokenFrom balance whenever tokenFrom changes or wallet balance is updated
  useEffect(() => {
    if (!tokenFrom) return;
    setTokenFromBalance(
      connectedWallets.reduce((total, connectedWallet) => {
        const walletBalance =
          connectedWallet.balances?.reduce((sum, balance) => {
            // Check if the balance matches the specific chain and address
            if (
              balance.chain === tokenFrom.blockchain &&
              balance.address === tokenFrom.address
            ) {
              return sum + parseFloat(balance.amount);
            }
            return sum;
          }, 0) || 0;
        return total + walletBalance;
      }, 0)
    );
  }, [tokenFrom, connectedWallets]);

  // Reverse the token pair (swap 'from' and 'to' tokens)
  const reverseTokenPair = () => {
    setTokenFrom(tokenTo);
    setTokenTo(tokenFrom);
  };

  return (
    <Card
      className={cn(
        "w-full rounded-3xl text-white glass-card shadow-card",
        isMobile ? "p-0" : "max-w-[650px] p-6 h-full"
      )}
    >
      {!isMobile && (
        <>
          <CardHeader className="p-4">
            <div className="h-auto bg-transparent flex w-full justify-between items-center">
              <CardTitle>Swap</CardTitle>
              <SettingModal>
                <Button className="bg-transparent hover:bg-transparent">
                  <TooltipTemplate content="Settings" className="!mb-1">
                    <Image
                      src={"/assets/icons/setting.png"}
                      alt="button-icon"
                      width={18}
                      height={18}
                    />
                  </TooltipTemplate>
                </Button>
              </SettingModal>
            </div>
          </CardHeader>
          <Separator className="hidden md:block bg-[#AAA]/20" />
        </>
      )}
      <CardContent
        className={cn(
          "flex flex-col justify-around",
          isMobile ? "px-5 py-[31px]" : "px-[31px] py-10"
        )}
      >
        <div className="w-full flex flex-col justify-evenly gap-2">
          {/* Token From Section */}
          <div className="flex justify-between items-end">
            <Label htmlFor="tokenFrom" className="text-sm font-medium uppercase tracking-wider text-white/50">
              {isMobile ? "You send" : "From"}
            </Label>
            {isWalletConnected && tokenFrom && (
              <div className="flex flex-col items-end gap-1">
                <Label className="text-xs text-white/50 tnum">
                  Balance:{" "}
                  {tokenFromBalance
                    ? `${formatCryptoAmount(tokenFromBalance)} ${tokenFrom.symbol}`
                    : "_"}
                </Label>
                {tokenFromBalance > 0 && (
                  <div className="flex gap-1 justify-end">
                    {[25, 50, 100].map((pct) => (
                      <button
                        key={pct}
                        className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary transition hover:bg-primary/25"
                        onClick={() =>
                          setAmountFrom(((tokenFromBalance * pct) / 100).toString())
                        }
                      >
                        {pct === 100 ? "MAX" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <TokenInput
            type="number"
            id="tokenFrom"
            placeholder="0.0"
            className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:outline-0 focus-visible:ring-offset-0 placeholder:text-white/30 pr-8 text-3xl md:text-4xl font-semibold tnum h-auto py-1"
            value={amountFrom}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              // e.target.value = parseFloat(e.target.value).toString();
              setAmountFrom(e.target.value);
            }}
            onClear={() => setAmountFrom("")}
            token={tokenFrom}
            setToken={setTokenFrom}
          />

          {/* Reverse Swap Button */}
          <Button
            variant="outline"
            className="self-center mt-7 mb-1 h-[54px] w-[54px] rounded-full border border-primary/40 bg-black/40 p-1 text-primary transition-all duration-500 hover:rotate-180 hover:border-primary hover:shadow-neon"
            onClick={reverseTokenPair}
          >
            <ArrowDownUp size={24} />
          </Button>

          {/* Token To Section */}
          <Label htmlFor="tokenTo" className="text-sm font-medium uppercase tracking-wider text-white/50">
            {isMobile ? "You get" : "To"}
          </Label>
          <TokenInput
            type="number"
            id="tokenTo"
            className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:outline-0 focus-visible:ring-offset-0 text-3xl md:text-4xl font-semibold tnum h-auto py-1"
            disabled
            token={tokenTo}
            setToken={setTokenTo}
            value={Number(amountTo) ? formatCryptoAmount(Number(amountTo)) : "0"}
          />
        </div>
      </CardContent>
      {!isMobile && (
        <CardFooter className="text-base md:text-xl p-0">
          {/* Footer Section: Handles the swap confirmation or wallet connection */}
          {!selectedRoute?.hasOwnProperty('outputAmount') ? (
            <Button
              variant="neon"
              className="w-full md:max-w-[75%] lg:max-w-[67%] h-14 mx-auto text-xl"
              disabled={!selectedRoute || state === DEXIFIER_STATE.PENDING || (!!swapData && state < DEXIFIER_STATE.PROCESSING)}
              onClick={() => {
                // After a swap ends (success/failure) offer a reset; during
                // processing allow cancelling back to a fresh state.
                if (state >= DEXIFIER_STATE.PROCESSING) {
                  initialize()
                } else {
                  setState(DEXIFIER_STATE.WITHDRAWAL_ADDRESS)
                }
              }}
            >
              {state === DEXIFIER_STATE.PROCESSING ? "Cancel" : state >= DEXIFIER_STATE.FAILED ? "Swap Again" : "Swap Now"}
            </Button>
          ) : !isWalletConnected ? (
            <WalletConnectModal>
              <Button
                className="h-14 w-3/4 lg:w-[67%] mx-auto"
                variant="neon"
              >
                Connect Wallet
              </Button>
            </WalletConnectModal>
          ) : (
            <ConfirmModal>
              <Button
                variant="neon"
                className="w-full md:max-w-[75%] lg:max-w-[67%] h-14 mx-auto text-xl"
                disabled={!selectedRoute || !!swapData}
              >
                Swap Now
              </Button>
            </ConfirmModal>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default DexifierCard;
