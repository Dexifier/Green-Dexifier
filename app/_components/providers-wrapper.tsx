'use client';

// Client-side wrapper for the app's providers. The wallet/stack libraries
// can't be server-rendered, so they are loaded with ssr:false — which Next.js
// only allows inside a Client Component (not in the server layout).

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const RangoProvider = dynamic(() => import("../providers/RangoProvider"), {
  ssr: false,
});
const DexifierProvider = dynamic(() => import("../providers/DexifierProvider"), {
  ssr: false,
});
const NotificationProvider = dynamic(() => import("../providers/NotificationProvider"), {
  ssr: false,
});

export default function ProvidersWrapper({ children }: { children: ReactNode }) {
  return (
    <RangoProvider>
      <DexifierProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </DexifierProvider>
    </RangoProvider>
  );
}
