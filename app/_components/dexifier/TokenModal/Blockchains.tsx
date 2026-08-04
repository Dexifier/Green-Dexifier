// This component displays a list of blockchain options with their logos and allows the user to select a blockchain from the grid.
// It also provides a modal to view more blockchain options.

import TooltipTemplate from "../../common/tooltip-template";
import React, { Dispatch, SetStateAction, useMemo } from "react";
import { cn } from "@/lib/utils";
import BlockchainModal from "./BlockchainModal";
import _ from "lodash";
import TokenIcon from "../../common/token-icon";
import { useDexifier } from "@/app/providers/DexifierProvider";
import { Blockchain } from "@/app/types/dexifier";
import { getChainBalancesUsd, getRecentChains, LOCAL_CHAIN_LOGOS, orderChains, rememberChain } from "@/app/utils/chains";
import { useWidget } from "@rango-dev/widget-embedded";

// Define props for the Blockchains component
interface BlockchainsProps {
  selectedBlockchain?: Blockchain; // The currently selected blockchain
  setSelectedBlockchain: Dispatch<SetStateAction<Blockchain | undefined>>; // Function to set the selected blockchain
}

const Blockchains: React.FC<BlockchainsProps> = ({ selectedBlockchain, setSelectedBlockchain }) => {
  const { chains } = useDexifier()
  const { wallets } = useWidget();
  const chainBalances = useMemo(() => getChainBalancesUsd(wallets.details), [wallets.details]);

  // Recently used chains first, then curated popularity, then the rest;
  // the selected chain always stays visible in the grid.
  // The grid mounts with the dialog, so getRecentChains() reads fresh values.
  const orderedChains = useMemo(() => {
    const ordered = orderChains(chains, getRecentChains(), chainBalances);
    return _.sortBy(ordered, (chain: Blockchain) => (chain.name === selectedBlockchain?.name ? 0 : 1));
  }, [chains, selectedBlockchain, chainBalances]);

  return (
    <div className="grid grid-cols-4 gap-x-6 gap-y-5 px-6">
      {/* Map over the blockchains and render the first 7 blockchains */}
      {orderedChains
        .slice(0, 7) // Limit the displayed blockchains to the first 7
        .map((blockchain: Blockchain, index: number) => (
          // Tooltip component to display the blockchain name when hovered
          <TooltipTemplate
            content={blockchain.name} // Content of the tooltip (blockchain name)
            className="!-mb-3"
            key={index}
          >
            <div
              className={cn(
                'group relative px-1 py-2 flex flex-col items-center justify-center gap-1 border rounded-3xl bg-transparent hover:bg-primary/10 hover:shadow-neon-sm hover:border-primary/60 hover:scale-[1.06] transition-all duration-300 cursor-pointer',
                selectedBlockchain?.displayName === blockchain.displayName ? "border-primary shadow-neon-sm" : "border-white/15" // Conditional border color for selected blockchain
              )}
              onClick={() => {
                rememberChain(blockchain.name); // Track usage for future ordering
                setSelectedBlockchain(blockchain);
              }}
            >
              {/* Avatar for displaying the blockchain logo — vendored locally for popular chains */}
              <TokenIcon
                token={{
                  image: LOCAL_CHAIN_LOGOS[blockchain.name] ?? blockchain.logo ?? '',
                  alt: blockchain.name,
                  className: "size-9",
                }}
              />
              {/* Name caption — icon-only cells are ambiguous on touch devices
                  (no hover) and for lookalike chains (Hyperliquid vs HyperEVM) */}
              <span className="max-w-full truncate text-[9px] leading-none text-white/55 group-hover:text-white/85 transition-colors">
                {blockchain.shortName ?? blockchain.displayName}
              </span>
              {blockchain.type === "EVM" && (
                <span className="absolute right-1.5 top-1.5 rounded-md bg-white/10 px-1 py-px text-[8px] font-bold tracking-wide text-primary">
                  EVM
                </span>
              )}
            </div>
          </TooltipTemplate>
        ))}
      {/* View More button, triggers BlockchainModal to show more blockchains */}
      <BlockchainModal
        selectedBlockchain={selectedBlockchain}
        setSelectedBlockchain={setSelectedBlockchain}
      >
        <div className="px-1 py-2.5 flex items-center justify-center border rounded-3xl bg-transparent hover:bg-white/5 transition-colors duration-300 cursor-pointer border-white/10">
          <h3 className="text-sm text-center">View More</h3> {/* Text to show the View More option */}
        </div>
      </BlockchainModal>
    </div>
  );
};

export default Blockchains;
