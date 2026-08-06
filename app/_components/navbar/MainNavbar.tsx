"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatUsd } from "@/app/utils";
import Link from "next/link";
import Image from "next/image";
import { useWalletList, useWidget } from "@rango-dev/widget-embedded";
import CustomLoader from "../common/loader";
import { useDexifier } from "../../providers/DexifierProvider";
import WalletConnectModal from "../dexifier/WalletConnectModal";
import WalletDetails from "./WalletDetails";
import { cn } from "@/lib/utils";
import TokenIcon from "../common/token-icon";
import { BiSolidWallet } from "react-icons/bi";
import { FaTelegramPlane } from "react-icons/fa";
import { Plus } from "lucide-react";

// Support lives in the Dexifier Telegram channel.
const SUPPORT_URL = "https://web.telegram.org/a/#-1002129981016";

const MainNavbar = () => {
  // Mobile = wallet-less swaps only (Exolix/Chainflip deposit flow), so the
  // wallet connection affordances stay out of the bar entirely.
  const { isMobile } = useDexifier();
  const { details: connectedWallets, totalBalance, isLoading } = useWidget().wallets;
  const { list } = useWalletList({})

  // The widget's totalBalance arrives as a grouped string like
  // "10,738.148921583781..." — strip the comma separators before parsing
  // (parseFloat("10,738...") would stop at the comma and read just 10).
  const formattedTotalBalance = useMemo(() => {
    const n = parseFloat((totalBalance ?? "").replace(/,/g, ""));
    return Number.isNaN(n) ? "0.00" : formatUsd(n);
  }, [totalBalance]);

  // A connected wallet appears in `details` before its balances are
  // fetched; in that gap `isLoading` is still false and totalBalance reads
  // "0", which flashed "$0.00" before the loader kicked in. Treat
  // "any connected wallet without balances yet" as loading too.
  const balancePending =
    isLoading ||
    connectedWallets.some((w) => (w as { balances?: unknown[] | null }).balances == null);

  const mappedWallets = connectedWallets.filter((connectedWallets, index, self) =>
    index === self.findIndex((w) => (
      w.walletType === connectedWallets.walletType
    ))
  ).map(wallet => {
    const detail = list.find(detail => detail.type === wallet.walletType);
    return {
      ...wallet,
      title: detail !== undefined ? detail.title : 'Unknown',
      image: detail !== undefined ? detail.image : null,
      link: detail !== undefined ? detail.link : null
    };
  });

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        scrolled ? "pt-2 sm:pt-3" : "pt-3 sm:pt-5",
      )}
    >
      <div className="mx-auto max-w-[86rem] px-2 sm:px-6 lg:px-8">
        <nav
          className={cn(
            // neon-frame = the rotating conic edge the swap cards wear
            "nav-shell neon-frame relative flex items-center justify-between gap-2 rounded-full border border-primary/25 bg-[#020805]/80 py-2 pl-4 pr-2 backdrop-blur-xl backdrop-saturate-150 transition-all duration-500 sm:pl-6 sm:pr-2.5",
            scrolled && "is-scrolled",
          )}
        >
          {/* Logo */}
          <Link href="/" aria-label="Dexifier home" className="group relative shrink-0 py-1">
            <Image
              priority
              className="w-[128px] transition-all duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_16px_rgba(19,241,135,0.5)] sm:w-[170px] lg:w-[195px]"
              src="/assets/logo.png"
              alt="Dexifier — swap everything"
              width={285}
              height={64}
            />
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Support — Telegram channel */}
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get support on Telegram"
              className="group flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/65 transition-all duration-300 hover:border-primary/50 hover:bg-primary/[0.08] hover:text-primary hover:shadow-neon-sm sm:px-4"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <FaTelegramPlane className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">Support</span>
            </a>

            {/* Wallet (desktop only — mobile swaps are wallet-less) */}
            {!isMobile && (!connectedWallets.length ?
              <WalletConnectModal>
                <button className="btn-sheen flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-black shadow-neon transition-all duration-300 hover:-translate-y-px hover:shadow-neon-lg hover:brightness-110 active:translate-y-0 active:scale-95 sm:h-11 sm:px-5 sm:text-xs">
                  <BiSolidWallet className="size-4 sm:size-5" />
                  <span className="sm:hidden">Connect</span>
                  <span className="hidden sm:inline">Connect Wallet</span>
                </button>
              </WalletConnectModal>
              :
              <div className="flex items-stretch overflow-hidden rounded-full border border-primary/35 bg-white/[0.04] shadow-neon-sm">
                <WalletDetails>
                  <button className="flex h-10 min-w-[86px] items-center justify-center gap-2 pl-2.5 pr-2 transition-colors duration-300 hover:bg-white/[0.06] sm:h-11 sm:pl-3 sm:pr-2.5">
                    {balancePending ?
                      <CustomLoader className="w-14" />
                      :
                      <>
                        <div className="flex -space-x-3">
                          {mappedWallets && mappedWallets.map((wallet, index) => (
                            <TokenIcon
                              key={index}
                              token={{
                                image: wallet.image!,
                                alt: wallet.title,
                                className: "size-6 ring-2 ring-[#04110a] sm:size-7",
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-extrabold tracking-wide text-primary sm:text-sm">
                          {formattedTotalBalance}
                          <span className="ml-0.5 text-primary/50">$</span>
                        </span>
                      </>
                    }
                  </button>
                </WalletDetails>
                <div className="my-auto h-5 w-px bg-primary/25" />
                <WalletConnectModal>
                  <button
                    aria-label="Add wallets"
                    className="flex h-10 items-center gap-1 bg-primary/[0.12] px-3 text-primary transition-colors duration-300 hover:bg-primary hover:text-black sm:h-11 sm:px-4"
                  >
                    <Plus className="size-4" strokeWidth={3} />
                    <span className="hidden text-[11px] font-extrabold uppercase tracking-[0.18em] lg:inline">Add</span>
                  </button>
                </WalletConnectModal>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default MainNavbar;
