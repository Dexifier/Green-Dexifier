import { CurrencyData } from "../app/types/exolix";
import { axiosExolix } from "../lib/axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sync data from Exolix
async function syncExolix() {
  const { data } = await axiosExolix.get(
    '/currencies?page=1&size=100&withNetworks=true'
  );
  const { count, data: initialData } = data;
  const totalPages = Math.ceil(count / 100);
  const pagePromises = Array.from(
    { length: totalPages - 1 },
    (_, pageIndex) =>
      axiosExolix.get(
        `/currencies?page=${pageIndex + 2}&size=100&withNetworks=true`
      )
  );
  const pageResponses = await Promise.all(pagePromises);
  const allCurrenciesData: CurrencyData[] = pageResponses.reduce((acc, response) => {
    if (response.status === 200) {
      const { data } = response.data;
      acc.push(...data);
    }
    return acc;
  }, initialData);

  const uniqueNetworks = Array.from(
    new Map(
      allCurrenciesData
        .flatMap(currency => currency.networks)
        .map(network => [network.network, network])
    ).values()
  );

  await prisma.network.createMany({
    data: uniqueNetworks.map(({coinNetworkId, ...network}) => ({
      ...network,
    })),
    skipDuplicates: true,
  });

  const savedNetworks = await prisma.network.findMany();

  const currencies = allCurrenciesData.flatMap(({networks, ...currencyData}) =>
    networks.map(network => ({
      ...currencyData,
      networkId: savedNetworks.find(n => n.network === network.network)?.id!,
    }))
  );


  await prisma.currency.createMany({
    data: currencies,
    skipDuplicates: true,
  });
}

syncExolix().then((_) => {
  console.log('✔ Synced data successfully!');
}).catch((error) => {
  console.error('Error syncing data:', error);
}).finally(async () => {
  await prisma.$disconnect();
});
