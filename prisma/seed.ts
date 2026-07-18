import "dotenv/config";
import axios from "axios";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CurrencyResponse } from "../app/types/exolix";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const exolix = axios.create({
  baseURL: process.env.EXOLIX_API_URL ?? "https://exolix.com/api/v2",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: process.env.EXOLIX_API_KEY ?? "",
  },
});

async function getCurrencies(): Promise<CurrencyResponse> {
  try {
    const { data } = await exolix.get("/currencies?page=1&size=100&withNetworks=true");
    const { count, data: initialData } = data;
    const totalPages = Math.ceil(count / 100);
    const pagePromises = Array.from({ length: totalPages - 1 }, (_, pageIndex) =>
      exolix.get(`/currencies?page=${pageIndex + 2}&size=100&withNetworks=true`)
    );
    const pageResponses = await Promise.all(pagePromises);
    const allCurrenciesData = pageResponses.reduce((acc, response) => {
      if (response.status === 200) {
        const { data } = response.data;
        acc.push(...data);
      }
      return acc;
    }, initialData);

    return { count: count, data: allCurrenciesData };
  } catch (error) {
    return { count: 0, data: [] };
  }
}

getCurrencies().then(async (res: CurrencyResponse) => {
  for (const currency of res.data) {
    // Insert each network for the currency
    const { networks, ...currencyData } = currency;
    for (const networkData of networks) {
      const { coinNetworkId, ..._networkData } = networkData;
      const network = await prisma.network.upsert({
        where: { network: networkData.network },
        update: {},
        create: _networkData,
      });

      // Link the network to the currency
      await prisma.currency.create({
        data: {
          ...currencyData,
          network: {
            connect: { id: network.id }, // Connect to an existing network
          },
        },
      });
    }
  }
});
