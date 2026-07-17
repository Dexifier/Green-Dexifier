'use client'

import type { SwapQueueContext, TargetNamespace } from '@rango-dev/queue-manager-rango-preset';
import type { Network, WalletType } from '@rango-dev/wallets-shared';
import type { PropsWithChildren } from 'react';

import {
  checkWaitingForNetworkChange,
  makeQueueDefinition,
} from '@rango-dev/queue-manager-rango-preset';
import { Provider as ManagerProvider } from '@rango-dev/queue-manager-react';
import { useWallets } from '@rango-dev/wallets-react';
import { convertEvmBlockchainMetaToEvmChainInfo } from '@rango-dev/wallets-shared';
import { BlockchainMeta, isEvmBlockchain } from 'rango-types';
import React, { useMemo } from 'react';
import { useWidget } from '@rango-dev/widget-embedded';

export function walletAndSupportedChainsNames(
  supportedBlockchains: BlockchainMeta[],
): Network[] | null {
  if (!supportedBlockchains) {
    return null;
  }
  let walletAndSupportedChainsNames: Network[] = [];
  walletAndSupportedChainsNames = supportedBlockchains.map(
    (blockchainMeta) => blockchainMeta.name,
  );

  return walletAndSupportedChainsNames;
}

function QueueManager(props: PropsWithChildren<{ apiKey?: string }>) {
  const {
    providers,
    getSigners,
    state,
    connect,
    canSwitchNetworkTo,
    getWalletInfo,
    hubProvider,
  } = useWallets();

  const swapQueueDef = useMemo(() => {
    return makeQueueDefinition({
      API_KEY: props.apiKey || "",
      BASE_URL: process.env.NEXT_PUBLIC_RANGO_API_URL,
    });
  }, [props.apiKey]);

  const { blockchains } = useWidget().meta;
  const { details: connectedWallets } = useWidget().wallets;

  const wallets = {
    blockchains: connectedWallets.map((wallet) => ({
      accounts: [wallet],
      name: wallet.chain,
    })),
  };

  // The queue asks to switch via a TargetNamespace ({ namespace, network }).
  // Bridge it to the namespaces-based connect() of the new wallets API.
  const switchNetwork = (wallet: WalletType, namespaces: TargetNamespace) => {
    if (!canSwitchNetworkTo(wallet, namespaces.network as Network, namespaces)) {
      return undefined;
    }
    return connect(wallet, [namespaces]);
  };

  const canSwitchNetworkToNamespace = (
    type: WalletType,
    network: Network,
    namespace: TargetNamespace,
  ) => canSwitchNetworkTo(type, network, namespace);

  const isMobileWallet = (walletType: WalletType): boolean =>
    !!getWalletInfo(walletType).mobileWallet;

  // TODO: this code copy & pasted from rango, should be refactored.
  const allBlockchains = blockchains
    .filter((blockchain) => blockchain.enabled)
    .reduce(
      (blockchainsObj: any, blockchain) => (
        (blockchainsObj[blockchain.name] = blockchain), blockchainsObj
      ),
      {}
    );
  const evmBasedChains = blockchains.filter(isEvmBlockchain);
  const getSupportedChainNames = (type: WalletType) => {
    const { supportedChains } = getWalletInfo(type);
    return walletAndSupportedChainsNames(supportedChains);
  };
  const allProviders = providers();

  const context: SwapQueueContext = {
    meta: {
      blockchains: allBlockchains,
      evmBasedChains: evmBasedChains,
      evmNetworkChainInfo:
        convertEvmBlockchainMetaToEvmChainInfo(evmBasedChains),
      getSupportedChainNames,
    },
    getSigners,
    wallets,
    providers: allProviders,
    hubProvider,
    switchNetwork,
    canSwitchNetworkTo: canSwitchNetworkToNamespace,
    state,
    isMobileWallet,
  };

  return (
    <ManagerProvider
      queuesDefs={[swapQueueDef]}
      context={context}
      onPersistedDataLoaded={(manager) => {
        checkWaitingForNetworkChange(manager);
      }}
      isPaused={false}>
      {props.children}
    </ManagerProvider>
  );
}

export default QueueManager;
