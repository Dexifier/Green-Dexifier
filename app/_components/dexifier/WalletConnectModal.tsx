import Image from "next/image";
import Search from "../common/search";
import { PropsWithChildren, useMemo, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useStatefulConnect, useWalletList, WalletInfoWithExtra } from "@rango-dev/widget-embedded";
import { WalletState } from "@rango-dev/ui";
import type { Namespace } from "@hub3js/namespaces";

// Text colors for different wallet states
const TextColorSet: Record<WalletState, string> = {
  [WalletState.NOT_INSTALLED]: "#a6e6ffad",
  [WalletState.DISCONNECTED]: "#c5c5c5ad",
  [WalletState.CONNECTING]: "",
  [WalletState.CONNECTED]: "#58ff66d6",
  [WalletState.PARTIALLY_CONNECTED]: "#58ff66d6",
};

// WalletConnectModalProps interface defines optional chain prop for filtering wallets by chain
interface WalletConnectModalProps {
  chain?: string;
}

const WalletConnectModal: React.FC<PropsWithChildren<WalletConnectModalProps>> = (props) => {
  const [search, setSearch] = useState<string>(""); // State for search input
  const { list } = useWalletList({ chain: props.chain }); // Fetch wallet list filtered by chain (if provided)
  // Hub-based wallets (MetaMask, Phantom, …) require explicit namespaces when
  // connecting — useStatefulConnect handles that flow for us.
  const { handleConnect, handleDisconnect } = useStatefulConnect();

  // Memoize the filtered wallet list based on the search input
  const filteredWalletList = useMemo(() => {
    return list.filter((walletData) =>
      walletData.title.toLowerCase().includes(search.toLowerCase()) // Filter wallets by title based on search input
    );
  }, [search, list]); // Recalculate when search input or wallet list changes

  // Handle wallet interaction: open wallet install link, connect or disconnect wallet
  const handleWallet = async (walletInfo: WalletInfoWithExtra) => {
    if (walletInfo.state === WalletState.NOT_INSTALLED) {
      // If wallet is not installed, open its installation link
      window.open(walletInfo.link as string, "_blank");
      return;
    }
    if (walletInfo.state === WalletState.CONNECTED) {
      // If wallet is connected, disconnect it
      await handleDisconnect(walletInfo).catch(console.error);
      return;
    }
    // Disconnected / partially connected: connect. Single-namespace hub
    // wallets (MetaMask, Phantom, …) connect directly through handleConnect.
    const result = await handleConnect(walletInfo).catch(console.error);
    if (!result) return;
    // Multi-namespace wallets (e.g. MetaMask advertising EVM + Solana) need an
    // explicit namespace selection. This is a multi-chain app, so connect to
    // every namespace the wallet offers — one at a time, so a namespace that
    // isn't actually usable (e.g. MetaMask Solana without the Snap) doesn't
    // abort the others.
    if (result.status === "Detached" || result.status === "namespace") {
      const namespaces =
        (walletInfo as WalletInfoWithExtra & {
          properties?: { name: string; value?: { data?: { value: Namespace }[] } }[];
        }).properties
          ?.find((p) => p.name === "namespaces")
          ?.value?.data?.map((d) => d.value) ?? [];
      for (const namespace of namespaces) {
        await handleConnect(walletInfo, { forceConnectToNamespaces: [namespace] }).catch((error) =>
          console.debug(`Namespace ${String(namespace)} not connected:`, error),
        );
      }
    }
  }

  return (
    <Dialog>
      {/* Trigger dialog via children */}
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-transparent max-h-[90vh] max-w-[90vw] p-4 md:p-6 bg-[#041008]/95 backdrop-blur-2xl border border-primary/25 shadow-neon-lg !rounded-3xl">
        {/* Dialog header with title and close button */}
        <DialogHeader className="flex flex-row justify-between">
          <DialogTitle className="font-display text-xl font-bold uppercase tracking-[0.15em]">Connect <span className="text-primary">{props.chain}</span> Wallets</DialogTitle>
          <DialogClose>
            <X className="w-7 h-7 p-1 bg-primary rounded-full font-bold text-black hover:bg-primary-dark transition-colors duration-300" />
          </DialogClose>
        </DialogHeader>
        <Separator className="bg-gradient-to-r from-transparent via-primary/40 to-transparent" /> {/* Separator between header and content */}
        {/* Search component for filtering wallets */}
        <Search value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-[60vh] flex flex-wrap justify-center overflow-auto gap-2 pr-1">
          {/* Render filtered wallets */}
          {filteredWalletList?.map((wallet, index) => (
            <button key={index} className="flex flex-col min-w-[125px] items-center justify-center gap-1 p-3 rounded-2xl border border-white/10 bg-white/5 disabled:cursor-not-allowed hover:bg-primary/10 hover:border-primary/50 hover:shadow-neon-sm hover:-translate-y-0.5 transition-all duration-300"
              onClick={() => handleWallet(wallet)} // Handle wallet click to connect, disconnect, or open installation link
            >
              <Image src={wallet.image} alt={wallet.type} width={45} height={45} /> {/* Wallet image */}
              <span className="text-sm font-medium">{wallet.title}</span> {/* Wallet title */}
              <span className="text-xs" style={{ color: TextColorSet[wallet.state] }}>
                {/* Wallet state text with color based on wallet state */}
                {wallet.state}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WalletConnectModal;