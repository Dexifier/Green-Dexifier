"use client";

import { motion } from "framer-motion";
import React from "react";

const BRANDS = [
  "xdefi",
  "metamask",
  "phantom",
  "keplr",
  "tron",
  "rango",
  "1inch",
  "across",
  "okx",
]

const SponsorSection = () => {
  return (
    <section className="gap-[9.5rem]">
      <p className="font-semibold text-[2.25rem] md:text-[3rem] xl:text-[4.5rem] text-primary leading-tight text-center py-16">
        Wallets & Projects
        <br />
        Supported
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 pb-16">
        {BRANDS.map((brand, index) => (
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1, transition: { type: "spring", duration: 2 } }}
            viewport={{ amount: 0.4, once: true }}
            className="bg-primary rounded-2xl overflow-hidden"
            key={index}
            src={`/assets/about-us/brand-${brand}.png`}
            alt={brand}
            width={300}
            height={300}
          />
        ))}
        <div className="flex items-center justify-center text-base lg:text-[27px]">
          And Many More...
        </div>
      </div>
    </section>
  );
};

export default SponsorSection;
