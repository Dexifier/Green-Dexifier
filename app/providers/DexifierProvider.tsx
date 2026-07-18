'use client'

// This file defines a React context for managing state related to a token dexifier page.
// It includes a DexifierContext and a DexifierProvider component to wrap dexifier page and 
// make the state accessible through the React Context API. Additionally, a custom hook
// (useDexifier) is provided for easier consumption of the context in components.

import { createContext, useContext, ReactNode, SetStateAction, Dispatch, useState, useEffect, useMemo, useRef } from "react";
import { BlockchainMeta, ConfirmRouteResponse, MultiRouteRequest, MultiRouteResponse, MultiRouteSimulationResult, Token as RangoToken, Transaction, TransactionType } from "rango-types/mainApi"
import { Settings } from "../types/rango";
import { ChainflipSwapResponse, ChainflipQuote, ChainflipError, ChainflipSwapStatus } from "../types/chainflip";
import { DCurrency, DNetwork, ExTxInfo, RateRequest, RateResponse, TxRequest } from "../types/exolix";
import { ConnectedWallet, useWallets, useWidget } from "@rango-dev/widget-embedded";
import { debounce } from "lodash";
import { CHAINFLIP_BLOCKCHAIN_NAME_MAP } from "../utils/chainflip";
import { ethers } from 'ethers';
import {
  createChainflipSwap,
  createExolixTransaction,
  getChainflipQuotes,
  getChainflipSwapStatus,
  getExolixRate,
  getExolixTxInfo,
  getRangoRoutes,
} from "@/lib/api-client";
import axios from "axios";
import { getExolixflipBlockchainName, MAP_BLOCKCHAIN_RANGO_2_EXOLIX } from "../utils/exolix";
import { Blockchain, Token } from "../types/dexifier";

// Define the type for the context
interface DexifierContextType {
  withdrawalAddress: string,                                                                  // The token being swapped from
  setWithdrawalAddress: Dispatch<SetStateAction<string>>,                          // Setter for tokenFrom
  refundAddress: string,                                                                    // The token being swapped to
  setRefundAddress: Dispatch<SetStateAction<string>>,
  tokenFrom?: Token,                                                                  // The token being swapped from
  setTokenFrom: Dispatch<SetStateAction<Token | undefined>>,                          // Setter for tokenFrom
  tokenTo?: Token,                                                                    // The token being swapped to
  setTokenTo: Dispatch<SetStateAction<Token | undefined>>,                            // Setter for tokenTo
  amountFrom?: string,
  setAmountFrom: Dispatch<SetStateAction<string | undefined>>,
  amountTo: string | number,
  selectedRoute?: DexifierRoute,                                                      // The currently selected swap route
  setSelectedRoute: Dispatch<SetStateAction<DexifierRoute | undefined>>,              // Setter for selectedRoute
  settings: Settings,                                                                 // Settings for the swap (e.g., slippage, infinite approval)
  setSettings: Dispatch<SetStateAction<Settings>>,                                    // Setter for settings
  routes: DexifierRoute[],
  state: DEXIFIER_STATE,
  setState: Dispatch<SetStateAction<DEXIFIER_STATE>>,
  walletFrom?: ConnectedWallet | string,
  setWalletFrom: Dispatch<SetStateAction<ConnectedWallet | string | undefined>>,
  walletTo?: ConnectedWallet | string,
  setWalletTo: Dispatch<SetStateAction<ConnectedWallet | string | undefined>>,
  swapData?: ChainflipSwapResponse | ExTxInfo | ConfirmRouteResponse,
  setSwapData: Dispatch<SetStateAction<ChainflipSwapResponse | ExTxInfo | ConfirmRouteResponse | undefined>>,
  swapStatus?: ChainflipSwapStatus | ExTxInfo,
  setSwapStatus: Dispatch<SetStateAction<ChainflipSwapStatus | ExTxInfo | undefined>>,
  initialize: () => void,
  stopConfirming: () => void,
  sendTx: (recipient: string) => Promise<{
    success: boolean;
    data: any;
  } | undefined>,
  isMobile: boolean,
  currencies: DCurrency[],
  chains: Blockchain[],
  coins: Token[],
  createSwap: () => Promise<any>,
}

// Create the context with an initial value
const DexifierContext: React.Context<DexifierContextType | undefined> = createContext<DexifierContextType | undefined>(undefined);

// Define default settings for the swap
const DEFAULT_SETTINS: Settings = {
  slippage: '1',           // Default slippage value for transactions
  swappers: [],            // Array of available swap providers
  infiniteApproval: false, // Indicates whether infinite approval is enabled
}

export enum DEXIFIER_MODERATOR {
  Rango = "Rango",
  Chainflip = "Chainflip",
  Exolix = "Exolix",
}

export enum DEXIFIER_STATE {
  START = 1,
  FETCHING_ROUTES = 2,
  ROUTES = 3,
  RANGO = 4,
  WITHDRAWAL_ADDRESS = 5,
  PENDING = 6,
  PROCESSING = 7,
  FAILED = 8,
  SUCCESS = 9,
}

export type DexifierRoute = MultiRouteSimulationResult | ChainflipQuote | RateResponse

const DexifierProvider = ({ children }: { children: ReactNode }) => {
  const [tokenFrom, setTokenFrom] = useState<Token>();
  const [tokenTo, setTokenTo] = useState<Token>();
  const [amountFrom, setAmountFrom] = useState<string>();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINS);
  const [routes, setRoutes] = useState<DexifierRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<DexifierRoute>();
  const [state, setState] = useState<DEXIFIER_STATE>(DEXIFIER_STATE.START);
  const [withdrawalAddress, setWithdrawalAddress] = useState<string>('');
  const [refundAddress, setRefundAddress] = useState<string>('');
  const [walletFrom, setWalletFrom] = useState<ConnectedWallet | string>();
  const [walletTo, setWalletTo] = useState<ConnectedWallet | string>();
  const [swapData, setSwapData] = useState<ChainflipSwapResponse | ExTxInfo | ConfirmRouteResponse>();
  const [swapStatus, setSwapStatus] = useState<ChainflipSwapStatus | ExTxInfo>();
  const [currencies, setCurrencies] = useState<DCurrency[]>([]);
  const [networks, setNetworks] = useState<DNetwork[]>([]);
  const confirmIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { getSigners } = useWallets();
  const isMobile = useMemo(() => {
    const userAgent = navigator.userAgent;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }, []);
  const { meta } = useWidget(); // Fetch widget metadata using the custom hook
  const { blockchains, tokens } = meta; // Extract blockchains from the metadata

  const chains: Blockchain[] = useMemo(() => {
    const bc = blockchains.map((blockchain: BlockchainMeta) => ({
      id: blockchain.chainId,
      name: blockchain.name,
      displayName: blockchain.displayName,
      shortName: blockchain.shortName,
      logo: blockchain.logo,
      color: blockchain.color,
    }))
    const nt = networks?.map(network => ({
      id: network.id + 100000000,
      name: network.network,
      displayName: network.name,
      shortName: network.shortName,
      logo: network.icon,
    })).filter(network => !bc.some(blockchain => blockchain.name === network.name || MAP_BLOCKCHAIN_RANGO_2_EXOLIX[blockchain.name] === network.name));

    return [...bc, ...nt];
  }, [blockchains, networks]);

  const coins: Token[] = useMemo(() => {
    const tk = tokens.map((token: RangoToken) => ({
      address: token.address,
      isPopular: token.isPopular,
      symbol: token.symbol,
      blockchain: token.blockchain,
      image: token.image,
      decimals: token.decimals,
      usdPrice: token.usdPrice,
    }))
    const cu = currencies?.map(currency => ({
      address: null,
      symbol: currency.code,
      blockchain: networks.find(n => n.id === currency.networkId)?.network,
      image: currency.icon,
    }))
    const seen = new Set<string>();
    const uniqueItems = [...tk, ...cu].filter(item => {
      const key = `${item.address}-${item.symbol}-${item.blockchain}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return uniqueItems;
  }, [networks, tokens, currencies])

  const amountTo = useMemo(() => {
    if (!selectedRoute) return 0
    else if ('outputAmount' in selectedRoute) {
      return Number(selectedRoute.outputAmount)
    } else if ('egressAmount' in selectedRoute) {
      return selectedRoute.egressAmount
    } else if ('toAmount' in selectedRoute) {
      return selectedRoute.toAmount
    } else return 0
  }, [selectedRoute])

  const initialize = () => {
    stopConfirming()
    setAmountFrom('0')
    setRoutes([])
    setSelectedRoute(undefined)
    setState(DEXIFIER_STATE.START)
    setSwapData(undefined)
    setSwapStatus(undefined)
  }

  const getRoutes = async (tokenFrom: Token, tokenTo: Token, amount: string): Promise<DexifierRoute[]> => {
    const allRoutes: DexifierRoute[] = []
    if (!tokenFrom.blockchain || !tokenTo.blockchain) return [];
    try {
      if (tokenFrom.blockchain in CHAINFLIP_BLOCKCHAIN_NAME_MAP && tokenTo.blockchain in CHAINFLIP_BLOCKCHAIN_NAME_MAP) {
        const chainflipQuotes = await getChainflipQuotes({
          sourceAsset: `${tokenFrom.symbol.toLowerCase()}.${CHAINFLIP_BLOCKCHAIN_NAME_MAP[tokenFrom.blockchain]}`,
          destinationAsset: `${tokenTo.symbol.toLowerCase()}.${CHAINFLIP_BLOCKCHAIN_NAME_MAP[tokenTo.blockchain]}`,
          amount: amount,
          commissionBps: 15,
        });

        if (allRoutes.push(...chainflipQuotes)) return allRoutes
      }
    } catch (error) { }
    try {
      const exolixRateRequest: RateRequest = {
        coinFrom: tokenFrom.symbol,
        networkFrom: getExolixflipBlockchainName(tokenFrom.blockchain),
        coinTo: tokenTo.symbol,
        networkTo: getExolixflipBlockchainName(tokenTo.blockchain),
        amount: amount,
        rateType: 'float',
      }
      const exolixRateResponse: RateResponse = await getExolixRate(exolixRateRequest)
      allRoutes.push(exolixRateResponse)
    } catch (error) { }
    if (!isMobile) try {
      const rangoMultiRouteRequest: MultiRouteRequest = {
        amount: amount,
        from: {
          address: tokenFrom.address,
          blockchain: tokenFrom.blockchain,
          symbol: tokenFrom.symbol,
        },
        to: {
          address: tokenTo.address,
          blockchain: tokenTo.blockchain,
          symbol: tokenTo.symbol,
        },
        slippage: settings.slippage.toString(),
        swapperGroups: settings.swappers.map(swapper => swapper.swapperGroup),
        swappersGroupsExclude: false,
      }
      const rangoMultiRouteResponse: MultiRouteResponse = await getRangoRoutes(rangoMultiRouteRequest)
      const rangoMultiRouteSimulationResults: MultiRouteSimulationResult[] = rangoMultiRouteResponse.results.sort((a, b) => a.swaps.length - b.swaps.length);
      allRoutes.push(...rangoMultiRouteSimulationResults)
    } catch (error) { }
    return allRoutes
  }

  const createSwap = async () => {
    if (!withdrawalAddress || !tokenFrom || !tokenTo || !amountFrom || !selectedRoute)
      return;
    setState(DEXIFIER_STATE.PENDING);
    if ('egressAmount' in selectedRoute) {
      // const depositAddressRequest: DepositAddressRequestV2 = {
      //   quote: selectedRoute as Quote,
      //   destAddress: withdrawalAddress,
      // };
      try {
        // const depositAddressResponse: DepositAddressResponseV2 =
        //   await chainflipSDK.requestDepositAddressV2(
        //     depositAddressRequest
        //   );
        const minimumPrice = selectedRoute.egressAmount * (1 - parseFloat(settings.slippage) / 100);
        const depositAddressResponse = await createChainflipSwap({
          sourceAsset: selectedRoute.ingressAsset,
          destinationAsset: selectedRoute.egressAsset,
          destinationAddress: withdrawalAddress,
          minimumPrice: minimumPrice,
          refundAddress: refundAddress,
          retryDurationInBlocks: 100,
        })
        setSwapData(depositAddressResponse);
      } catch (error) {
        setState(DEXIFIER_STATE.WITHDRAWAL_ADDRESS);
        const detail = (error as { data?: ChainflipError })?.data?.detail;
        if (detail) throw new Error(detail);
        throw error;
      }
    }
    if ('toAmount' in selectedRoute) {
      const txRequest: TxRequest = {
        coinFrom: tokenFrom.symbol,
        networkFrom: tokenFrom.blockchain,
        coinTo: tokenTo.symbol,
        networkTo: tokenTo.blockchain,
        amount: parseFloat(amountFrom),
        withdrawalAddress: withdrawalAddress,
        rateType: "float",
      };
      try {
        const txResponse = await createExolixTransaction(txRequest);
        setSwapData(txResponse);
      } catch (error) {
        setState(DEXIFIER_STATE.WITHDRAWAL_ADDRESS);
        const apiError = (error as { data?: { error?: string } })?.data?.error;
        if (apiError) throw new Error(apiError);
        throw error;
      }
    }
  }

  const debounceFetchRoutes = useMemo(
    () =>
      debounce(async () => {
        if (tokenFrom && tokenTo && amountFrom && parseFloat(amountFrom)) {
          setState(DEXIFIER_STATE.FETCHING_ROUTES)
          const allRoutes = await getRoutes(tokenFrom, tokenTo, amountFrom)
          setRoutes(allRoutes)
          if (allRoutes.length) setSelectedRoute(allRoutes[0])
          setState(DEXIFIER_STATE.ROUTES)
        } else {
          setState(DEXIFIER_STATE.START)
          setRoutes([])
          setSelectedRoute(undefined)
        }
      }, 1000), // 1s delay
    [tokenFrom, tokenTo, amountFrom]
  )

  useEffect(() => {
    debounceFetchRoutes()
    return () => {
      debounceFetchRoutes.cancel();
    };
  }, [tokenFrom, tokenTo, amountFrom])

  const sendTx = async (recipient: string) => {
    if (walletFrom && typeof walletFrom !== 'string' && tokenFrom && amountFrom) {
      const tokenContractAddress = tokenFrom.address; // The ERC-20 token contract address
      const tokenAmount = amountFrom; // Amount of tokens to send (human-readable)
      const decimals = tokenFrom.decimals; // Token decimals (usually 18 for ERC-20)

      // Encode the transfer function data
      const erc20Interface = new ethers.Interface([
        'function transfer(address to, uint256 amount) public returns (bool)',
      ]);
      const amountInWei = ethers.parseUnits(tokenAmount, decimals); // Convert amount to smallest unit
      const data = erc20Interface.encodeFunctionData('transfer', [recipient, amountInWei]);

      const transaction: Transaction = {
        from: walletFrom.address,
        to: tokenContractAddress || recipient,
        type: TransactionType.EVM,
        blockChain: tokenFrom.blockchain || '',
        isApprovalTx: true,
        data: data,
        value: tokenContractAddress ? null : amountInWei.toString(),
        prerequisites: [],
        nonce: null,
        gasLimit: null,
        gasPrice: null,
        maxPriorityFeePerGas: null,
        maxFeePerGas: null,
      };

      return (await getSigners(walletFrom.walletType)).getSigner(TransactionType.EVM).signAndSendTx(transaction, walletFrom.address, null)
        .then((hash) => ({ success: true, data: hash }))
        .catch(error => ({ success: false, data: error }))
    }
  }

  const stopConfirming = () => {
    clearInterval(confirmIntervalRef.current);
    confirmIntervalRef.current = undefined;
  }

  useEffect(() => {
    if (swapData) {
      // Clear any existing interval before starting a new one
      stopConfirming();

      if ('channelId' in swapData) {
        confirmIntervalRef.current = setInterval(async () => {
          try {
            const statusData = await getChainflipSwapStatus(swapData.id);
            setSwapStatus(statusData);
            if (statusData.state === "COMPLETED" || statusData.state === "FAILED") {
              stopConfirming();
            }
          } catch {
            // Keep polling — transient errors should not kill the status loop
          }
        }, 10000); // Poll every 10 seconds (adjust as needed)
      }
      if ('amountTo' in swapData) {
        confirmIntervalRef.current = setInterval(async () => {
          const txInfo = await getExolixTxInfo(swapData.id);
          setSwapStatus(txInfo);
          if (txInfo.status === "success" || txInfo.status === "overdue" || txInfo.status === "refunded") {
            stopConfirming();
          }
        }, 5000); // Poll every 5 seconds (adjust as needed)
      }
    } else {
      stopConfirming();
    }
  }, [swapData])

  useEffect(() => {
    if (swapStatus) {
      setState(DEXIFIER_STATE.PROCESSING);
      if ("state" in swapStatus) {
        if (swapStatus.state === 'SENT') setState(DEXIFIER_STATE.SUCCESS)
        if (swapStatus.state === 'FAILED') setState(DEXIFIER_STATE.FAILED)
      }
      if ("status" in swapStatus) {
        if (swapStatus.status === 'success') setState(DEXIFIER_STATE.SUCCESS)
        if (swapStatus.status === 'overdue') setState(DEXIFIER_STATE.FAILED)
        if (swapStatus.status === 'refunded') setState(DEXIFIER_STATE.FAILED)
      }
    }
  }, [swapStatus])

  useEffect(() => {
    axios.get(
      `/api/exolix/currency`
    ).then(result => {
      setCurrencies(result.data as DCurrency[])
    });
    axios.get(
      `/api/exolix/network`
    ).then(result => {
      setNetworks(result.data as DNetwork[])
    });
  }, [])

  // Prefill the swap pair from URL query params, e.g.
  // /?from=BTC&fromChain=BTC&to=ETH&toChain=ETH (used by the /swap/[pair]
  // landing pages to deep-link into a ready-made swap).
  useEffect(() => {
    if (typeof window === "undefined" || !coins.length) return;
    if (tokenFrom || tokenTo) return; // never override a user's selection
    const q = new URLSearchParams(window.location.search);
    const find = (symbol: string | null, chain: string | null) =>
      symbol
        ? coins.find(
            (c) =>
              c.symbol.toLowerCase() === symbol.toLowerCase() &&
              (!chain || c.blockchain?.toLowerCase() === chain.toLowerCase()),
          )
        : undefined;
    const prefillFrom = find(q.get("from"), q.get("fromChain"));
    const prefillTo = find(q.get("to"), q.get("toChain"));
    if (prefillFrom) setTokenFrom(prefillFrom);
    if (prefillTo) setTokenTo(prefillTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins])

  return (
    <DexifierContext.Provider
      value={{
        // tokenFrom, setTokenFrom, tokenTo, setTokenTo, routeData, setRouteData, selectedRoute, setSelectedRoute, confirmData, setConfirmData, settings, setSettings,
        tokenFrom, setTokenFrom, tokenTo, setTokenTo, amountFrom, setAmountFrom, amountTo,
        settings,
        setSettings,
        routes,
        selectedRoute,
        setSelectedRoute,
        state,
        setState,
        swapData,
        setSwapData,
        swapStatus,
        setSwapStatus,
        walletFrom,
        setWalletFrom,
        walletTo,
        setWalletTo,
        initialize,
        stopConfirming,
        sendTx,
        isMobile,
        currencies,
        chains,
        coins,
        withdrawalAddress,
        setWithdrawalAddress,
        refundAddress,
        setRefundAddress,
        createSwap,
      }}
    >
      {children}
    </DexifierContext.Provider>
  )
};

// Custom hook to use the Dexifier context
export const useDexifier = () => {
  const context = useContext(DexifierContext);
  // Throw an error if the hook is used outside of a DexifierProvider
  if (!context) {
    throw new Error("useDexifier must be used within a DexifierProvider");
  }
  return context;
};

export default DexifierProvider