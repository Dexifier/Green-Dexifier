import type { Metadata } from 'next';
import SwapPage from './SwapPage';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const match = params.slug.match(/^swap-([^-]+)-([^-]+)-to-([^-]+)-([^-]+)$/);
  let description = 'Swap tokens across blockchains with Dexifier.';
  let title = 'Dexifier Swap | Swap Tokens';
  let keywords = ['dexifier', 'swap', 'crypto', 'blockchain', 'token swap'];
  if (match) {
    const [, coinFrom, chainFrom, coinTo, chainTo] = match;
    const coF = coinFrom.toUpperCase();
    const coT = coinTo.toUpperCase();
    const chF = chainFrom.toUpperCase();
    const chT = chainTo.toUpperCase();
    description = `Swap your ${coF} on ${chF} Network to ${coT} on ${chT} Network instantly on Dexifier’s decentralized platform. Enjoy fast transactions, low fees, and full control of your assets — no registration or KYC required. Start swapping ${coF} to ${coT} securely and seamlessly today.`;
    title = `Dexifier Swap | ${coF} - ${coT}`;
    keywords = [
      ...keywords,
      coF, chF, coT, chT, `${coF} to ${coT}`, `${chF} to ${chT}`
    ];
  }
  return {
    title,
    description,
    keywords,
  };
}

export default function Page({ params }: PageProps) {
  return <SwapPage params={params} />;
}