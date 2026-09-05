import Image from "next/image";
import Search from "../common/search";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContent, useResponsiveModal } from "../common/responsive-modal";
import { TriangleAlert, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useStatefulConnect, useWalletList, WalletInfoWithExtra } from "@rango-dev/widget-embedded";
import { WalletState } from "@rango-dev/ui";
import type { Namespace } from "@hub3js/namespaces";
import { preflightWalletUnlock, WalletStuckRequestError, withMetaMaskProviderOverride, withTimeout } from "@/app/utils/wallet-preflight";
import { connectNamespacesFor } from "@/app/utils/wallet-namespaces";

// If a wallet stays in "connecting" this long after we asked it to connect,
// the extension never answered — reset it instead of spinning forever.
const CONNECT_WATCHDOG_MS = 60_000;
// Each namespace connect (e.g. MetaMask Solana) must not hang the others.
const NAMESPACE_TIMEOUT_MS = 45_000;

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
  const { Root, Trigger, Close, Header, Title } = useResponsiveModal();
  const [search, setSearch] = useState<string>(""); // State for search input
  const [hint, setHint] = useState<string | null>(null); // Visible feedback when a wallet fails to respond
  const { list } = useWalletList({ chain: props.chain }); // Fetch wallet list filtered by chain (if provided)
  // Hub-based wallets (MetaMask, Phantom, …) require explicit namespaces when
  // connecting — useStatefulConnect handles that flow for us.
  const { handleConnect, handleDisconnect } = useStatefulConnect();

  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; }, [list]);
  const watchdogsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showHint = (message: string) => {
    setHint(message);
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 8000);
  };

  // Clear the watchdog as soon as the wallet leaves the CONNECTING state.
  useEffect(() => {
    list.forEach((wallet) => {
      const timer = watchdogsRef.current.get(wallet.type);
      if (timer && wallet.state !== WalletState.CONNECTING) {
        clearTimeout(timer);
        watchdogsRef.current.delete(wallet.type);
      }
    });
  }, [list]);
  useEffect(() => () => {
    watchdogsRef.current.forEach(clearTimeout);
    clearTimeout(hintTimerRef.current);
  }, []);

  // A connect attempt that never resolves must not spin on "connecting"
  // forever — reset the wallet and tell the user what to do.
  const armWatchdog = (walletInfo: WalletInfoWithExtra) => {
    clearTimeout(watchdogsRef.current.get(walletInfo.type));
    watchdogsRef.current.set(walletInfo.type, setTimeout(() => {
      watchdogsRef.current.delete(walletInfo.type);
      const current = listRef.current.find((w) => w.type === walletInfo.type);
      if (current?.state === WalletState.CONNECTING) {
        handleDisconnect(walletInfo).catch(() => {});
        showHint(`${walletInfo.title} is not responding. Open the extension, unlock it, and try again.`);
      }
    }, CONNECT_WATCHDOG_MS));
  };

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
    // Disconnected / partially connected: connect. First fire the wallet's
    // own unlock prompt (MetaMask / Phantom / TronLink) so a locked wallet
    // pops open instead of parking in "connecting" forever. If the user
    // declines or nothing answers, we stop before Rango's state machine
    // ever enters "connecting".
    try {
      await preflightWalletUnlock(walletInfo.type);
    } catch (error) {
      console.debug(`Preflight unlock failed for ${walletInfo.type}:`, error);
      if (error instanceof WalletStuckRequestError) {
        // A previous connect attempt wedged inside the wallet (its unlock/
        // approval screen was closed or lost). The wallet rejects every new
        // request until the user clears the pending one — only they can.
        showHint(`${walletInfo.title} has a stuck connection request. Open the extension, approve or reject the pending request, then press Connect again.`);
        return;
      }
      showHint(`${walletInfo.title} isn't answering. Open the extension — unlock it or clear any pending request — then press Connect again.`);
      return;
    }
    armWatchdog(walletInfo);
    // Rango's MetaMask connect reads window.ethereum only — when an impostor
    // (e.g. Phantom's EVM provider) owns it and spoofs isMetaMask, the tile
    // would connect to the wrong wallet. Temporarily point window.ethereum
    // at the strictly-identified MetaMask for the duration of the connect.
    const connect = () =>
      walletInfo.type === "metamask"
        ? withMetaMaskProviderOverride(() => handleConnect(walletInfo))
        : handleConnect(walletInfo);
    const result = await connect().catch((error) => {
      console.error(error);
      showHint(`Could not connect ${walletInfo.title}. Please try again.`);
      return undefined;
    });
    if (!result) return;
    // Multi-namespace wallets (e.g. MetaMask advertising EVM + Solana) need an
    // explicit namespace selection. This is a multi-chain app, so connect to
    // every namespace the wallet offers — one at a time, so a namespace that
    // isn't actually usable (e.g. MetaMask Solana without the Snap) doesn't
    // abort the others. A hung namespace must not block the rest.
    if (result.status === "Detached" || result.status === "namespace") {
      const advertised =
        (walletInfo as WalletInfoWithExtra & {
          properties?: { name: string; value?: { data?: { value: Namespace }[] } }[];
        }).properties
          ?.find((p) => p.name === "namespaces")
          ?.value?.data?.map((d) => d.value) ?? [];
      // Some wallets advertise namespaces Rango can't actually connect —
      // MetaMask's Solana namespace hangs the whole connect. Filter first.
      const namespaces = connectNamespacesFor(walletInfo.type, advertised);
      for (const namespace of namespaces) {
        const attempt =
          walletInfo.type === "metamask"
            ? withMetaMaskProviderOverride(() =>
                handleConnect(walletInfo, { forceConnectToNamespaces: [namespace] }),
              )
            : handleConnect(walletInfo, { forceConnectToNamespaces: [namespace] });
        // Belt-and-braces: Rango's namespace connect can reject on internal
        // paths; keep it from ever surfacing as an unhandled rejection.
        attempt.catch(() => {});
        await withTimeout(attempt, NAMESPACE_TIMEOUT_MS, String(namespace)).catch(
          (error) =>
            console.debug(`Namespace ${String(namespace)} not connected:`, error),
        );
      }
    }
  }

  return (
    <Root>
      {/* Trigger dialog via children */}
      <Trigger asChild>{props.children}</Trigger>
      <ResponsiveContent className="sm:max-w-md md:max-h-[90vh] md:max-w-[90vw] p-4 md:p-6 md:bg-[#041008]/95 md:backdrop-blur-2xl md:border md:border-primary/25 md:shadow-neon-lg md:!rounded-3xl">
        {/* Dialog header with title and close button */}
        <Header className="flex flex-row justify-between">
          <Title className="font-display text-xl font-bold uppercase tracking-[0.15em]">Connect <span className="text-primary">{props.chain}</span> Wallets</Title>
          <Close>
            <X className="w-7 h-7 p-1 bg-primary rounded-full font-bold text-black hover:bg-primary-dark transition-colors duration-300" />
          </Close>
        </Header>
        <Separator className="bg-gradient-to-r from-transparent via-primary/40 to-transparent" /> {/* Separator between header and content */}
        {/* Feedback when a wallet doesn't answer (locked, popup dismissed, …) */}
        {hint && (
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-left">
            <TriangleAlert className="size-4 shrink-0 text-amber-300" />
            <span className="text-xs leading-snug text-amber-100/90">{hint}</span>
          </div>
        )}
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
      </ResponsiveContent>
    </Root>
  )
}

export default WalletConnectModal;