import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPairBySlug, SWAP_PAIRS, type SwapPair } from "@/lib/pairs";
import { exolixGet } from "@/lib/server/exolix";
import type { RateResponse } from "@/app/types/exolix";

// Statically generated at build time, refreshed hourly (ISR).
export const revalidate = 3600;

export function generateStaticParams() {
  return SWAP_PAIRS.map((p) => ({ pair: p.slug }));
}

type PageProps = { params: Promise<{ pair: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pair: slug } = await params;
  const pair = getPairBySlug(slug);
  if (!pair) return {};
  const title = `Swap ${pair.from.symbol} to ${pair.to.symbol} — ${pair.from.name} to ${pair.to.name} | Dexifier`;
  const description = `Exchange ${pair.from.name} (${pair.from.symbol}) for ${pair.to.name} (${pair.to.symbol}) with no sign-up and no KYC. Compare live rates across 65+ chains and swap in minutes on Dexifier.`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.dexifier.com/swap/${pair.slug}` },
    openGraph: { title, description, url: `https://www.dexifier.com/swap/${pair.slug}` },
  };
}

async function getReferenceRate(pair: SwapPair): Promise<RateResponse | null> {
  try {
    return await exolixGet<RateResponse>("/rate", {
      coinFrom: pair.from.symbol,
      networkFrom: pair.from.network,
      coinTo: pair.to.symbol,
      networkTo: pair.to.network,
      amount: "1",
      rateType: "float",
    });
  } catch {
    return null; // Page still renders — rate is a nice-to-have
  }
}

function faqJsonLd(pair: SwapPair, rate: RateResponse | null) {
  const faqs = [
    {
      q: `How do I swap ${pair.from.symbol} to ${pair.to.symbol}?`,
      a: `Enter the amount of ${pair.from.symbol} you want to exchange, paste your ${pair.to.chainName} receiving address, send ${pair.from.symbol} to the deposit address shown, and receive ${pair.to.symbol} directly in your wallet. No account or KYC is required.`,
    },
    {
      q: `What is the current ${pair.from.symbol} to ${pair.to.symbol} exchange rate?`,
      a: rate
        ? `At the moment 1 ${pair.from.symbol} is approximately ${rate.rate} ${pair.to.symbol}. Rates update continuously; the exact quote is locked in when you create the swap.`
        : `Rates update continuously. Open the swap page to get a live quote for your exact amount.`,
    },
    {
      q: `Do I need to create an account or pass KYC?`,
      a: `No. Dexifier is a non-custodial exchange aggregator — no logins, no sign-ups and no KYC. Your crypto goes straight to your own wallet.`,
    },
    {
      q: `How long does a ${pair.from.symbol} to ${pair.to.symbol} swap take?`,
      a: `Most swaps complete in 5–30 minutes, depending on confirmation times on the ${pair.from.chainName} and ${pair.to.chainName} networks.`,
    },
    {
      q: `Is there a minimum amount for ${pair.from.symbol} to ${pair.to.symbol}?`,
      a: rate?.minAmount
        ? `Yes — currently the minimum is about ${rate.minAmount} ${pair.from.symbol}.`
        : `Minimum amounts vary with network fees; the live quote shows the current minimum for your pair.`,
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default async function SwapPairPage({ params }: PageProps) {
  const { pair: slug } = await params;
  const pair = getPairBySlug(slug);
  if (!pair) notFound();

  const rate = await getReferenceRate(pair);
  const ctaHref = `/?from=${pair.from.symbol}&fromChain=${pair.from.network}&to=${pair.to.symbol}&toChain=${pair.to.network}`;

  return (
    <main className="min-h-screen bg-[#0b1510] text-white pt-32 pb-24 px-4">
      <article className="mx-auto max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(pair, rate)) }}
        />

        <p className="text-sm uppercase tracking-widest text-emerald-400">
          {pair.from.chainName} → {pair.to.chainName}
        </p>
        <h1 className="mt-2 text-4xl md:text-5xl font-bold">
          Swap {pair.from.symbol} to {pair.to.symbol}
        </h1>
        <p className="mt-4 text-lg text-white/70">
          Exchange {pair.from.name} for {pair.to.name} in minutes — no
          sign-up, no KYC, no custody. Dexifier compares routes across 65+
          blockchains and sends {pair.to.symbol} straight to your wallet.
        </p>

        {rate && (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6">
            <p className="text-sm text-white/60">Reference rate (updates hourly)</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-300">
              1 {pair.from.symbol} ≈ {rate.rate} {pair.to.symbol}
            </p>
            {rate.minAmount ? (
              <p className="mt-2 text-sm text-white/50">
                Minimum: {rate.minAmount} {pair.from.symbol}
              </p>
            ) : null}
          </div>
        )}

        <Link
          href={ctaHref}
          className="mt-8 inline-block rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-black transition hover:bg-emerald-400"
        >
          Swap {pair.from.symbol} → {pair.to.symbol} now
        </Link>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">
            How to swap {pair.from.symbol} to {pair.to.symbol}
          </h2>
          <ol className="mt-6 space-y-4 text-white/80">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">1</span>
              <span>Choose {pair.from.symbol} ({pair.from.chainName}) as the asset you send and {pair.to.symbol} ({pair.to.chainName}) as the asset you receive, then enter the amount.</span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">2</span>
              <span>Compare the available routes — Dexifier ranks them by rate and speed — and pick the one that suits you.</span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">3</span>
              <span>Paste your {pair.to.chainName} receiving address. Optionally add a {pair.from.chainName} refund address for extra safety.</span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">4</span>
              <span>Send your {pair.from.symbol} to the deposit address shown. Your {pair.to.symbol} arrives in your wallet once the swap completes — usually within 5–30 minutes.</span>
            </li>
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">
            Why swap {pair.from.symbol} to {pair.to.symbol} on Dexifier?
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            <li className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold text-emerald-300">No KYC, ever</h3>
              <p className="mt-2 text-sm text-white/70">No accounts, no logins, no identity checks. Your privacy is the product, not the price.</p>
            </li>
            <li className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold text-emerald-300">Best-rate routing</h3>
              <p className="mt-2 text-sm text-white/70">We aggregate Rango, Chainflip and instant-exchange liquidity so you see the strongest route for {pair.from.symbol}/{pair.to.symbol}.</p>
            </li>
            <li className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold text-emerald-300">Non-custodial</h3>
              <p className="mt-2 text-sm text-white/70">Funds move wallet-to-wallet. Dexifier never holds your coins or your keys.</p>
            </li>
            <li className="rounded-xl border border-white/10 p-5">
              <h3 className="font-semibold text-emerald-300">24/7 human support</h3>
              <p className="mt-2 text-sm text-white/70">Real people on Discord around the clock if a swap ever needs a hand.</p>
            </li>
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">FAQ</h2>
          <div className="mt-6 space-y-6">
            {(faqJsonLd(pair, rate).mainEntity as { name: string; acceptedAnswer: { text: string } }[]).map((f) => (
              <div key={f.name}>
                <h3 className="font-semibold text-white/90">{f.name}</h3>
                <p className="mt-1 text-white/70">{f.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        <nav className="mt-16 border-t border-white/10 pt-8">
          <h2 className="text-lg font-semibold">Popular swaps</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {SWAP_PAIRS.filter((p) => p.slug !== pair.slug)
              .slice(0, 12)
              .map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/swap/${p.slug}`}
                    className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition hover:border-emerald-400 hover:text-emerald-300"
                  >
                    {p.from.symbol} → {p.to.symbol}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </article>
    </main>
  );
}
