import "./globals.css";
import React from "react";
import MainNavbar from "./_components/navbar/MainNavbar";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Analytics from "./Analytics";
import ProvidersWrapper from "./_components/providers-wrapper";

const inter = Plus_Jakarta_Sans({ subsets: ["latin"] });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.dexifier.com"),
  title: "Dexifier",
  description:
    "Trade crypto securely on Dexifier, the best decentralized exchange for fast, low-fee, and anonymous transactions. No sign-ups, just seamless trading.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-256x256.png", sizes: "256x256", type: "image/png" },
      { url: "/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dexifier",
  },
  verification: {
    google: 'AZAQ3ajFzkdwX4XX-agcNjf6mIRASqRdeAWvxzgFsv8',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Warm up connections to the remote icon hosts (popular chain icons
            are vendored locally, everything else loads from these) */}
        <link rel="preconnect" href="https://raw.githubusercontent.com" />
        <link rel="dns-prefetch" href="https://raw.githubusercontent.com" />
        <link rel="preconnect" href="https://rango.vip" />
        <link rel="dns-prefetch" href="https://rango.vip" />
        <link rel="preconnect" href="https://exolix.com" />
        <link rel="dns-prefetch" href="https://exolix.com" />
        <Analytics />
      </head>
      <body id="root" className={`${inter.className} ${display.variable}`}>
        <ProvidersWrapper>
          <MainNavbar />
          {children}
        </ProvidersWrapper>
        <ToastContainer />
      </body>
    </html>
  );
}
