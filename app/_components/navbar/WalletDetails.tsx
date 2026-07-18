import React, { ReactNode, useEffect, useMemo, useState } from "react";
import _ from 'lodash';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { BlockchainMeta, Token } from "rango-types/mainApi";
import Search from "../common/search";
import Image from "next/image"
import ButtonCopyIcon from "../common/coyp-button-icon";
import TooltipTemplate from "../common/tooltip-template";
import Link from "next/link";
import { ConnectedWallet, WalletInfoWithExtra } from "@rango-dev/widget-embedded";
import { useWalletList, useWidget } from "@rango-dev/widget-embedded";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect } from "@/components/ui/multi-select";
import { formatCryptoAmount, formatUsd, getAbbrAddress } from "@/app/utils";
import TokenIcon from "../common/token-icon";
import { TbRefresh } from "react-icons/tb";

enum MORE_SETTINGS {
  HIDE_SMALL_BALANCE = "Hide small balances",
  HIDE_EMPTY_WALLET = "Hide empty wallets",
  HIDE_UNSUPPORTED_TOKEN = "Hide unsupported tokens",
};

const SETTINGS = [
  MORE_SETTINGS.HIDE_SMALL_BALANCE,
  MORE_SETTINGS.HIDE_EMPTY_WALLET,
  MORE_SETTINGS.HIDE_UNSUPPORTED_TOKEN,
]

// The widget no longer exports its balance type publicly; this mirrors the
// shape returned in `useWidget().wallets.details[].balances`.
type TokenBalance = {
  chain: string;
  symbol: string;
  ticker?: string;
  address: string | null;
  rawAmount?: string;
  decimal?: number | null;
  amount: string;
  isSupported?: boolean;
  logo?: string | null;
  usdPrice: number | null;
};

type WalletWithBalances = ConnectedWallet & {
  balances?: TokenBalance[] | null;
};

interface WalletDetailsProps {
  children: ReactNode;
}

const WalletDetails: React.FC<WalletDetailsProps> = ({ children }) => {
  const [search, setSearch] = useState<string>('');
  const [filteredWallets, setFilteredWallets] = useState<WalletWithBalances[]>([]);
  // Selection is tracked as *deselected* sets: newly connected wallets and
  // newly loaded chains are included by default, and only an explicit
  // user action excludes them.
  const [deselectedWalletTypes, setDeselectedWalletTypes] = useState<string[]>([]);
  const [deselectedChains, setDeselectedChains] = useState<string[]>([]);
  const [moreSettings, setMoreSettings] = useState<MORE_SETTINGS[]>([
    MORE_SETTINGS.HIDE_SMALL_BALANCE,
    MORE_SETTINGS.HIDE_UNSUPPORTED_TOKEN,
  ]);

  const { meta, wallets } = useWidget();
  const { details: connectedWallets, refetch } = wallets;
  const { list } = useWalletList({});
  const { blockchains, tokens } = meta;
  const walletTypes = Array.from(new Set(connectedWallets.map(wallet => wallet.walletType)))
    .map(walletType => list.find(wallet => wallet.type === walletType))
    .filter((wallet): wallet is WalletInfoWithExtra => wallet !== undefined)

  const availableWalletTypes = useMemo(() => walletTypes.map(w => w.type), [walletTypes]);
  const availableChainNames = useMemo(() => blockchains.map(b => b.name), [blockchains]);

  const visibleWalletTypes = useMemo(
    () => availableWalletTypes.filter(t => !deselectedWalletTypes.includes(t)),
    [availableWalletTypes, deselectedWalletTypes],
  );
  const visibleChainNames = useMemo(
    () => availableChainNames.filter(n => !deselectedChains.includes(n)),
    [availableChainNames, deselectedChains],
  );

  const getTokenBalanceInUSD = (token: TokenBalance) => {
    return parseFloat(token.amount) * (token.usdPrice ?? 0);
  }

  const getWalletBalanceInUSD = (wallets: WalletWithBalances[]) => {
    const walletBalanceInUSD = wallets.map(wallet => {
      if (!wallet.balances) return 0;
      return wallet.balances?.map(balance => {
        return getTokenBalanceInUSD(balance);
      }).reduce((acc, cur) => acc + cur, 0);
    }).reduce((acc, cur) => acc + cur, 0);

    return walletBalanceInUSD;
  };

  useEffect(() => {
    setFilteredWallets(structuredClone(connectedWallets).filter(wallet => {
      // Exclude wallets with deselected chains and wallet types
      if (!visibleChainNames.includes(wallet.chain) || !visibleWalletTypes.includes(wallet.walletType)) return false;
      // Filter wallets with search term
      if (!wallet.chain.toLowerCase().includes(search.toLowerCase())) return false;
      // Exclude tokens with small balance in the wallet if 'isHideSmallBalance' is true.
      // NOTE: this must run BEFORE the empty-wallet check — it can empty a
      // wallet's token list, and such wallets must then count as empty.
      if (moreSettings.includes(MORE_SETTINGS.HIDE_SMALL_BALANCE) && wallet.balances) {
        wallet.balances = wallet.balances.filter((balance) => getTokenBalanceInUSD(balance) > 1)
      }
      // Exclude wallets with zero balance if 'isHideEmptyWallet' is true:
      // no tokens left after filtering, or nothing of value.
      if (moreSettings.includes(MORE_SETTINGS.HIDE_EMPTY_WALLET)) {
        if (!wallet.balances?.length) return false;
        if (getWalletBalanceInUSD([wallet]) === 0) return false;
      }
      return true;
    }).sort((a, b) => getWalletBalanceInUSD([b]) - getWalletBalanceInUSD([a])));
  }, [
    search,
    connectedWallets,
    visibleWalletTypes,
    visibleChainNames,
    moreSettings,
  ]);

  const getWalletIcon = (wallet: ConnectedWallet) => {
    return list.find(detail => detail.type === wallet.walletType)?.image;
  }

  const getTokenIcon = (token: TokenBalance) => {
    return tokens.find((tk: Token) => tk.blockchain === token.chain && tk.address === token.address).image;
  }

  const handleRefresh = () => {
    refetch(connectedWallets)
  }

  // Balances stream in after the wallet appears — don't flash a partial
  // "$0.00" total while any wallet's balances are still missing.
  const balancePending = connectedWallets.some(
    (w) => (w as WalletWithBalances).balances == null,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="bg-[#041008]/95 backdrop-blur-2xl border-l border-primary/25 p-4 min-w-[450px] flex flex-col">
        <SheetHeader className="border-b border-white/10">
          <SheetTitle className="w-full flex justify-center relative p-2">
            <span className="text-xl text-primary">
              {balancePending ? "…" : `${formatUsd(getWalletBalanceInUSD(filteredWallets))}$`}
            </span>
            <SheetClose className="absolute right-2">
              <X className="w-7 h-7 p-1 bg-primary rounded-full font-bold text-black hover:bg-primary-dark transition-colors duration-300" />
            </SheetClose>
          </SheetTitle>
          <SheetDescription className="flex justify-between p-2 pt-0">
            <span className="text-2xl font-bold text-white">Your Wallet</span>
            <button onClick={handleRefresh}>
              <TbRefresh className="size-6 text-primary" />
            </button>
          </SheetDescription>
        </SheetHeader>
        <Search value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex w-full space-x-2">
          <MultiSelect
            options={walletTypes.map((walletType: WalletInfoWithExtra) => ({
              value: walletType.type,
              label: walletType.title,
              icon: walletType.image,
              realValue: walletType,
            }))}
            title="Your Wallets"
            onRealValueChange={(values: WalletInfoWithExtra[]) => {
              // Store what the user unchecked — everything else stays visible,
              // including wallets connected later.
              setDeselectedWalletTypes(
                availableWalletTypes.filter(t => !values.some(v => v.type === t))
              );
            }}
            value={visibleWalletTypes}
            placeholder="No Wallet"
            className="bg-primary text-black border-none hover:bg-primary-dark flex-1"
            unit="wallet"
          />
          <MultiSelect
            options={blockchains.map((blockchain: BlockchainMeta) => ({
              value: blockchain.name,
              label: blockchain.name,
              icon: blockchain.logo,
              realValue: blockchain
            }))}
            value={visibleChainNames}
            title="Your Blockchains"
            onRealValueChange={(values: BlockchainMeta[]) => {
              setDeselectedChains(
                availableChainNames.filter(n => !values.some(v => v.name === n))
              );
            }}
            placeholder="No Blockchain"
            className="bg-primary text-black border-none hover:bg-primary-dark flex-1"
            unit="chain"
          />
          <MultiSelect
            options={SETTINGS.map((setting: MORE_SETTINGS) => ({
              value: setting,
              label: setting,
              realValue: setting,
            }))}
            title="More"
            onRealValueChange={(values: MORE_SETTINGS[]) => {
              setMoreSettings(values);
            }}
            value={moreSettings}
            placeholder="..."
            className="bg-primary text-black border-none hover:bg-primary-dark flex-none h-10 w-10"
            config={{
              showSelectAll: false,
              showContent: false,
              showSearch: false,
            }}
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="h-full">
            {filteredWallets.map((wallet, index) => (
              <SubWallet
                key={index}
                wallet={wallet}
                getWalletBalanceInUSD={getWalletBalanceInUSD}
                getTokenBalanceInUSD={getTokenBalanceInUSD}
                getWalletIcon={getWalletIcon}
                getTokenIcon={getTokenIcon}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const SubWallet: React.FC<any> = ({
  wallet,
  getWalletBalanceInUSD,
  getTokenBalanceInUSD,
  getWalletIcon,
  getTokenIcon
}: {
  wallet: WalletWithBalances,
  getWalletBalanceInUSD: (wallets: WalletWithBalances[]) => number,
  getTokenBalanceInUSD: (token: TokenBalance) => number,
  getWalletIcon: (wallet: ConnectedWallet) => string,
  getTokenIcon: (wallets: TokenBalance) => string,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(wallet === null);
  const balanceInUSD = getWalletBalanceInUSD([wallet]);
  return (
    <div className="pr-2">
      <button className="flex justify-between items-center text-sm border border-primary hover:opacity-80 p-3 rounded-lg mt-2 w-full bg-[#13f1871f]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex gap-2 text-lg font-bold items-center" >
          <Image src={"/assets/icons/arrow.png"}
            className={`transition-transform duration-500 ease-in-out ${!isOpen ? 'rotate-0' : 'rotate-180'}`}
            width={20}
            height={20}
            alt={"arrow"}
          />
          <TokenIcon
            token={{
              image: getWalletIcon(wallet) || "/assets/wallet/default",
              alt: wallet.chain,
              className: "size-8",
            }}
          />
          {wallet.chain}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span>{getAbbrAddress(wallet.address)}</span>
            <ButtonCopyIcon text={wallet.address} />
            <TooltipTemplate content={"link to wallet"} className="px-2 py-1">
              <Link href={wallet.explorerUrl ?? '#'} target="_black">
                <Image src={"/assets/icons/link.png"} width={18} height={18} alt="link" />
              </Link>
            </TooltipTemplate>
          </div>
          <span className="text-primary">{balanceInUSD ? formatUsd(balanceInUSD) + "$" : ""}</span>
        </div>
      </button>
      <div className="p-2 text-[#e5e7ebc9]">
        {wallet && wallet.balances && isOpen && (wallet.balances.length === 0 ? <div className="text-sm text-center "> No tokens found</div> : wallet.balances.map((balance: any, index: number) => {
          return (
            <div key={index} className="flex justify-between items-center border-b border-b-[#13F18738] py-2">
              <div className="flex items-center gap-2">
                <TokenIcon
                  token={{
                    image: getTokenIcon(balance),
                    alt: balance.symbol,
                    className: "size-8",
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-md text-[#FFFFFF]">{balance.symbol}</span>
                  <span className="text-xs  text-[#717171] font-bold">{balance.chain}</span>
                </div>
              </div>
              <div className="flex flex-col mr-3">
                <span>{formatCryptoAmount(parseFloat(balance.amount) || 0)}</span>
                <span className="text-xs">{formatUsd(getTokenBalanceInUSD(balance))} $</span>
              </div>
            </div>
          )
        }))}
      </div>
    </div>
  )
}

export default WalletDetails;