import delay from 'delay';
import { consoleLog, mapObjectsToValueOfKey } from '../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import { URL_XML_IMOBILIARE_LISTINGS_BUCHAREST } from '../Constants.js';

export class IndexInitializerImobiliareRo extends IndexInitializer {
    getListingIdFromUrl(url) {
        const lastDashIndex = url.lastIndexOf('-');
        return url.slice(lastDashIndex + 1);
    }

    async start() {
        consoleLog(`[${this.source}] Initialization started.`);

        const xmlListings = await this.fetchListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);

        const xmlListingsToInit = await this.getXmlListingsToInit(xmlListings);
        await this.upsertXmlListingsToDatabase(xmlListingsToInit);

        let browser, browserPage;

        try {
            [browser, browserPage] = await this.getNewBrowserAndNewPage();
        } catch (error) {
            consoleLog(`[${this.source}] Cannot launch headless browser.`);
            consoleLog(error);
            throw error;
        }

        for (let i = 0; i < xmlListingsToInit.length; i++) {
            let listingData;

            try {
                consoleLog(`[${this.source}] Fetching listing [${i + 1}] from: ${xmlListingsToInit[i].url}`);
                listingData = await this.fetchListingDataFromPage(xmlListingsToInit[i], browserPage);
            } catch (error) {
                consoleLog(`[${this.source}] Cannot fetch listing data from: ${xmlListingsToInit[i].url}`);
                consoleLog(error);
                await browser.close();
                [browser, browserPage] = await this.getNewBrowserAndNewPage();
                await this.dbMarketListings.deleteOne({ id: xmlListingsToInit[i].id });
                continue;
            }

            await this.dbMarketListings.updateOne({ id: listingData.id }, { $set: listingData });
            consoleLog(`[${this.source}] Fetched and saved listing successfully. Waiting...`);
            await delay(this.smartRequester.getRandomRestingDelay());
        }

        await browser.close();
        consoleLog(`[${this.source}] Initialization complete.`);
    }

    async getXmlListingsToInit(xmlListings) {
        const initializedListingsIds = await this.dbMarketListings.find(
            { price: { $exists: true } },
            { projection: { _id: 0, id: 1 } }
        );

        const initializedListingsIdsSet = new Set(mapObjectsToValueOfKey(initializedListingsIds, 'id'));

        return xmlListings.filter((xmlListing) => !initializedListingsIdsSet.has(xmlListing.id));
    }

    async upsertXmlListingsToDatabase(xmlListings) {
        consoleLog(`[${this.source}] Upserting ${xmlListings.length} listings from XML to database...`);

        for (let i = 0; i < xmlListings.length; i++) {
            await this.dbMarketListings.updateOne(
                { id: xmlListings[i].id },
                {
                    $set: {
                        id: xmlListings[i].id,
                        lastModified: xmlListings[i].lastModified,
                    },
                },
                { upsert: true }
            );
        }

        consoleLog(`[${this.source}] Upserted listings.`);
    }
}
