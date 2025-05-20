import type { Metadata } from 'next';
import SwapPage from './[slug]/SwapPage';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Dexifier Swap | Swap Tokens',
    description: 'Swap tokens across blockchains with Dexifier.',
    keywords: ['dexifier', 'swap', 'crypto', 'blockchain', 'token swap'],
  };
}

export default function Home() {
  return <SwapPage />;
}
