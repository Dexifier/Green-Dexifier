<<<<<<< Updated upstream
import { TokenBalance } from "@/app/types/interface";
=======
import { TokenBalance, WalletData } from "@/app/types/interface";
>>>>>>> Stashed changes
import { Wallet, WidgetConfig } from "@/app/wallet/types";
import { ProviderInterface } from "@rango-dev/wallets-react";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ConnectedWallet extends Wallet {
  balances: TokenBalance[] | null;
  explorerUrl: string | null;
  selected: boolean;
  loading: boolean;
  error: boolean;
}

const initialWalletList: {
  connectedWallets: ConnectedWallet[]
<<<<<<< Updated upstream
  config: WidgetConfig
  providers: ProviderInterface[]
} = {
  connectedWallets: [{
    balances: null,
    explorerUrl: null,
    selected: false,
    loading: false,
    error: false,
    chain: "",
    address: "",
    walletType: ""
  }],
  config: { apiKey: "" },
  providers: []
=======
  refOfConnectButton: HTMLButtonElement | null
  config: WidgetConfig
  providers: ProviderInterface[]
} = {
  connectedWallets: [],
  config: { apiKey: "" },
  providers: [],
  refOfConnectButton: null
>>>>>>> Stashed changes
}

export const walletSlice = createSlice({
  name: "wallet",
  initialState: initialWalletList,
  reducers: {
    updateConnectedWallet(
      state,
<<<<<<< Updated upstream
      action: PayloadAction<{ walletList: ConnectedWallet[] }>
    ) {
      return { ...state, connectedWallets: action.payload.walletList };
    },
=======
      action: PayloadAction<{ accounts: WalletData[] }>
    ) {
      const accounts = action.payload.accounts;
      const newState = state.connectedWallets
        .filter((wallet) => wallet.walletType !== accounts[0].walletType)
        .concat(
          accounts.map((account) => {
            const shouldMarkWalletAsSelected = !state.connectedWallets.find(
              (connectedWallet) =>
                connectedWallet.chain === account.chain &&
                connectedWallet.selected,
            );
            return {
              balances: [],
              address: account.address,
              chain: account.chain,
              explorerUrl: null,
              walletType: account.walletType,
              selected: shouldMarkWalletAsSelected,
              loading: true,
              error: false,
            };
          }),
        )
      return { ...state, connectedWallets: newState };
    },
    setButtonRef(
      state,
      action: PayloadAction<{ refButton: HTMLButtonElement }>
    ) {
      return {
        ...state,
        refOfConnectButton: action.payload.refButton
      }
    },
    clearConnectedWallet(
      state,
      action: PayloadAction<{}>
    ) {
      return {
        ...state,
        connectedWallets: [],
      };
    },
    disconnectedWallet(
      state,
      action: PayloadAction<{ walletType: string }>
    ) {
      const walletType = action.payload.walletType
      const selectedWallets = state.connectedWallets
        .filter(
          (connectedWallet) =>
            connectedWallet.selected &&
            connectedWallet.walletType !== walletType,
        )
        .map((selectedWallet) => selectedWallet.chain);

      const connectedWallets = state.connectedWallets
        .filter(
          (connectedWallet) => connectedWallet.walletType !== walletType,
        )
        .map((connectedWallet) => {
          const anyWalletSelectedForBlockchain = selectedWallets.includes(
            connectedWallet.chain,
          );
          if (anyWalletSelectedForBlockchain) {
            return connectedWallet;
          }
          selectedWallets.push(connectedWallet.chain);
          return { ...connectedWallet, selected: true };
        });

      return { ...state, connectedWallets: connectedWallets };
    },

>>>>>>> Stashed changes
    updateWalletProvider(
      state,
      action: PayloadAction<{ providers: ProviderInterface[] }>
    ) {
      return { ...state, providers: action.payload.providers };
    },
  }
});

<<<<<<< Updated upstream
export const { updateConnectedWallet, updateWalletProvider } =
=======
export const { updateConnectedWallet, updateWalletProvider, disconnectedWallet, clearConnectedWallet, setButtonRef } =
>>>>>>> Stashed changes
  walletSlice.actions;
