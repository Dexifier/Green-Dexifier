import { X } from "lucide-react";
import {
  Fragment,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { ConfirmRouteRequest, ConfirmRouteResponse } from "rango-types/mainApi";
import CustomLoader from "../common/loader";
import { confirmRangoRoute } from "@/lib/api-client";
import { toastError } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ConnectedWallet,
  useWidget,
  useWallets,
  useWalletList,
} from "@rango-dev/widget-embedded";
import { useManager } from "@rango-dev/queue-manager-react";
import { calculatePendingSwap } from "@rango-dev/queue-manager-rango-preset";
import { confirmHasError, getWalletsForNewSwap } from "@/app/utils/swap";
import { Wallet } from "@/app/types/rango";
import { Button } from "@/components/ui/button";
import { DEXIFIER_STATE, useDexifier } from "@/app/providers/DexifierProvider";
import { RadioGroup } from "@/components/ui/radio-group";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import ButtonCopyIcon from "../common/coyp-button-icon";
import WalletConnectModal from "./WalletConnectModal";
import TokenIcon from "../common/token-icon";
import { getAbbrAddress } from "@/app/utils";

type SwapToken = {
  amount: number;
  symbol: string;
  blockchain?: string;
};

type SwapInfo = {
  from: SwapToken;
  to: SwapToken;
};

// ConfirmModal component for confirming a wallet before swapping assets
const ConfirmModal: React.FC<PropsWithChildren> = (props) => {
  const { meta } = useWidget();
  const { blockchains, tokens } = meta;
  const { getSigners } = useWallets();
  const { manager } = useManager();
  const { wallets } = useWidget();
  const { details: connectedWallets } = wallets; // Extract connected wallet details
  const { list } = useWalletList(); // Fetch the list of supported wallets
  const {
    selectedRoute,
    tokenFrom,
    tokenTo,
    amountFrom,
    walletFrom,
    setWalletFrom,
    walletTo,
    setWalletTo,
    setSwapData,
    settings,
    setState,
    isMobile,
  } = useDexifier();
  const [isInitializingSwap, initializeSwap] = useTransition();

  // State hooks for managing the modal, wallets, and withdrawal address input
  const [open, setOpen] = useState<boolean>(false);

  const [withdrawalAddress, setWithdrawalAddress] = useState<string>();

  const swapInfo: SwapInfo | undefined = useMemo(() => {
    if (!selectedRoute) return;
    if ("outputAmount" in selectedRoute) {
      const tokenFromRango = selectedRoute.swaps.at(0);
      const tokenToRango = selectedRoute.swaps.at(-1);
      if (!tokenFromRango || !tokenToRango) return;
      return {
        from: {
          amount: Number(tokenFromRango.fromAmount),
          symbol: tokenFromRango.from.symbol,
          blockchain: tokenFromRango.from.blockchain,
        },
        to: {
          amount: Number(tokenToRango.toAmount),
          symbol: tokenToRango.to.symbol,
          blockchain: tokenToRango.to.blockchain,
        },
      };
    }
    // Handle chainflip & exolix swap
    {
      /*
    if ('egressAmount' in selectedRoute) {
      const tokenFromChainflip: Token = tokens.find((token: Token) => formatChainName(token.blockchain) === selectedRoute.srcAsset.chain && token.symbol === selectedRoute.srcAsset.asset)
      const tokenToChainflip: Token = tokens.find((token: Token) => formatChainName(token.blockchain) === selectedRoute.destAsset.chain && token.symbol === selectedRoute.destAsset.asset)
      if (!tokenFromChainflip || !tokenToChainflip) return
      return {
        from: {
          amount: parseFloat(selectedRoute.depositAmount) / (10 ** tokenFromChainflip.decimals),
          symbol: selectedRoute.srcAsset.asset as string,
          blockchain: formatChainName(selectedRoute.srcAsset.chain),
        },
        to: {
          amount: parseFloat(selectedRoute.egressAmount) / (10 ** tokenToChainflip.decimals),
          symbol: selectedRoute.destAsset.asset as string,
          blockchain: formatChainName(selectedRoute.destAsset.chain),
        },
      }
    }
    if ('toAmount' in selectedRoute) {
      const routeExolix = selectedRoute as RateResponse
      if (!tokenFrom || !tokenTo) return
      return {
        from: {
          amount: routeExolix.fromAmount,
          symbol: tokenFrom.symbol,
          blockchain: tokenFrom.blockchain,
        },
        to: {
          amount: routeExolix.toAmount,
          symbol: tokenTo.symbol,
          blockchain: tokenTo.blockchain,
        },
      }
    }
    */
    }
  }, [selectedRoute, tokenFrom, tokenTo]);

  useEffect(() => {
    if (swapInfo && connectedWallets) {
      setWalletFrom(
        connectedWallets.filter(
          (wallet) => wallet.chain === swapInfo.from.blockchain
        )[0]
      );
      setWalletTo(
        connectedWallets.filter(
          (wallet) => wallet.chain === swapInfo.to.blockchain
        )[0]
      );
    }
  }, [swapInfo, connectedWallets]);

  async function pasteWithdrawalAddressFromClipboard() {
    try {
      if (navigator.clipboard) {
        const clipboardText = await navigator.clipboard.readText();
        setWithdrawalAddress(clipboardText);
      } else {
        console.error("Clipboard API not supported.");
      }
    } catch (error) {
      console.error("Failed to read from clipboard:", error);
    }
  }

  const confirmSwap = async () => {
    if (
      !selectedRoute ||
      !walletFrom ||
      !walletTo ||
      !tokenFrom ||
      !tokenTo ||
      !amountFrom ||
      (walletTo === "custom" && !withdrawalAddress)
    )
      return;
    initializeSwap(async () => {
      if ("outputAmount" in selectedRoute) {
        // Perform the confirmation when ready
        const selectedWallets = [walletFrom, walletTo]
          .filter((wallet): wallet is ConnectedWallet => wallet !== undefined)
          .reduce<{ [key: string]: string }>((acc, wallet) => {
            acc[wallet.chain] = wallet.address;
            return acc;
          }, {});

        // Prepare request for confirming the route
        const confirmRequest: ConfirmRouteRequest = {
          requestId: selectedRoute.requestId,
          selectedWallets: selectedWallets,
          destination:
            typeof walletTo === "string"
              ? walletTo
              : (walletTo as ConnectedWallet).address,
        };

        // Attempt to confirm the route and handle errors
        try {
          const confirmData: ConfirmRouteResponse = await confirmRangoRoute(
            confirmRequest
          );
          if (confirmData && manager) {
            setSwapData(confirmData);
            const confirmSwapResult = confirmData.result;

            if (!(confirmSwapResult && confirmSwapResult.result)) {
              throw Error(confirmData.error || "");
            }

            const selectedWallets = [walletFrom, walletTo]
              .filter(
                (wallet): wallet is ConnectedWallet => wallet !== undefined
              )
              .map((wallet) => {
                const _wallet: Wallet = wallet as Wallet;
                return _wallet;
              });

            // Calculate the pending swap
            const swap = calculatePendingSwap({
              inputAmount: confirmSwapResult.requestAmount,
              bestRoute: confirmSwapResult,
              wallets: getWalletsForNewSwap(selectedWallets),
              settings: {
                slippage: settings.slippage,
                infiniteApprove: settings.infiniteApproval,
              },
              validateBalanceOrFee: confirmHasError(confirmData).error,
              meta: { blockchains, tokens },
            });

            // Create the swap request via the manager
            await manager.create(
              "swap",
              { swapDetails: swap },
              { id: swap.requestId }
            );
          }
        } catch (error) {
          toastError(error as string);
        }
      }
      setOpen(false); // Close the modal after confirming the swap
      setState(DEXIFIER_STATE.RANGO);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        // setConfirmData(undefined);  // Clear confirmation data when modal is closed
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="w-[30rem] bg-transparent max-h-[90vh] max-w-[90vw] p-6 bg-[#041008]/95 backdrop-blur-2xl border border-primary/25 shadow-neon-lg !rounded-3xl">
        <DialogHeader>
          <div className="flex flex-row justify-between p-2">
            <DialogTitle className="font-display text-xl font-bold uppercase tracking-[0.15em] text-glow">Confirm</DialogTitle>
            <DialogClose>
              <X className="w-7 h-7 p-1 bg-primary rounded-full font-bold text-black hover:bg-primary-dark transition-colors duration-300" />
            </DialogClose>
          </div>
          <Separator className="bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <DialogDescription className="flex items-center justify-around">
            {swapInfo && (
              <div className="text-center py-2">
                <div className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Confirm Swap
                </div>
                <div className="mt-1 text-sm text-white/80">
                  <span className="text-primary text-lg tnum font-semibold">
                    {swapInfo.from.amount.toFixed(2)}
                  </span>{" "}
                  {swapInfo.from.symbol} [{swapInfo.from.blockchain}] →{" "}
                  <span className="text-primary text-lg tnum font-semibold">
                    {swapInfo.to.amount.toFixed(2)}
                  </span>{" "}
                  {swapInfo.to.symbol} [{swapInfo.to.blockchain}]
                </div>
              </div>
            )}
            {/* <button className="w-[30px] px-1" onClick={confirmWallet}>
              <Image src={"/assets/icons/reset-icon.png"} width={20} height={20} alt="refresh" />
            </button> */}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[40vh] overflow-y-auto pe-1">
          <div className="space-y-4">
            {Array.from(
              new Set(
                [swapInfo?.from.blockchain, swapInfo?.to.blockchain].filter(
                  (c): c is string => Boolean(c)
                )
              )
            ).map((chain, index, chains) => {
                const shared = chains.length === 1; // same-chain swap: one section picks both wallets
                const availableWallets = connectedWallets.filter(
                  (wallet) => wallet.chain === chain
                );
                return (
                  <Fragment key={chain}>
                    {/* Label for the wallet section */}
                    <Label htmlFor={chain} className="flex items-center gap-2">
                      <div className="rounded-full size-6 bg-primary font-bold grid place-content-center text-black">
                        <div>{index + 1}</div>
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-wider text-white/60">Your {chain} wallet</span>
                    </Label>
                    {/* RadioGroup for selecting the wallet */}
                    <RadioGroup
                      id={chain}
                      className="flex flex-wrap justify-center gap-2"
                      value={
                        index
                          ? typeof walletTo === "string"
                            ? walletTo
                            : walletTo?.walletType
                          : typeof walletFrom === "string"
                          ? walletFrom
                          : walletFrom?.walletType
                      }
                      onValueChange={(value) => {
                        const found = connectedWallets.find(
                          (wallet) =>
                            wallet.walletType === value &&
                            wallet.chain === chain
                        );
                        if (index === 0) {
                          setWalletFrom(found ?? value);
                          if (shared) setWalletTo(found ?? withdrawalAddress);
                        } else {
                          setWalletTo(found ?? withdrawalAddress);
                        }
                      }} // Update the selected wallet when a new wallet type is chosen
                    >
                      {/* Map over }the connected wallets and display each wallet */}
                      {availableWallets.map(
                        (wallet: ConnectedWallet, index: number) => (
                          <RadioGroupPrimitive.Item
                            value={wallet.walletType}
                            id={wallet.walletType}
                            key={index}
                            className="w-24 h-28 rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:shadow-neon-sm hover:-translate-y-0.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:shadow-neon-sm"
                          >
                            <div className="flex justify-center">
                              <TokenIcon
                                token={{
                                  image: list.find(
                                    (detail) =>
                                      detail.type === wallet.walletType
                                  )?.image,
                                  alt: wallet.walletType,
                                  className: "size-12",
                                }}
                              />
                            </div>
                            <span className="capitalize font-display font-semibold">
                              {wallet.walletType}
                            </span>{" "}
                            {/* Display wallet type */}
                            <span className="flex items-center justify-center text-[11px] tnum text-white/50">
                              <span>{getAbbrAddress(wallet.address)}</span>{" "}
                              {/* Display abbreviated wallet address */}
                              <div className="size-4 place-items-center">
                                <ButtonCopyIcon text={wallet.address} />{" "}
                                {/* Copy button for wallet address */}
                              </div>
                            </span>
                          </RadioGroupPrimitive.Item>
                        )
                      )}
                      {/* Modal to connect more wallets */}
                      <WalletConnectModal chain={chain}>
                        <div className="w-24 h-28 rounded-2xl border border-white/10 bg-white/5 flex text-center items-center justify-center text-sm text-white/50 cursor-pointer transition-all duration-300 hover:border-primary/50 hover:bg-primary/10 hover:-translate-y-0.5">
                          More wallet...
                        </div>
                      </WalletConnectModal>
                    </RadioGroup>
                  </Fragment>
                );
              }
            )}
          </div>
        </div>
        {/* <div className="text-error font-bold text-xs text-center tracking-wide">{confirmHasError(confirmData).message}</div> */}
        <Button
          variant="neon"
          onClick={confirmSwap}
          className="btn-sheen w-full h-14 text-lg font-extrabold uppercase tracking-widest"
          disabled={
            isInitializingSwap ||
            !walletFrom ||
            !walletTo ||
            (walletTo === "custom" && !withdrawalAddress)
          }
        >
          {isInitializingSwap ? (
            <CustomLoader className="!size-8" />
          ) : (
            "Confirm"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmModal;
