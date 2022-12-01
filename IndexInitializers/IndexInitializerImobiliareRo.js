import delay from 'delay';
import { consoleLog } from '../Helpers/Utils.js';
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

        consoleLog(`[${this.source}] Inserting ${xmlListings.length} listings from XML to database...`);
        const shortListingsToInsert = xmlListings.map((listing) => ({
            id: listing.id,
            lastModified: listing.lastModified,
        }));
        await this.dbMarketListings.insertMany(shortListingsToInsert);

        let browser, browserPage;

        try {
            [browser, browserPage] = await this.getNewBrowserAndNewPage();
        } catch (error) {
            consoleLog(`[${this.source}] Cannot launch headless browser.`);
            consoleLog(error);
            throw error;
        }

        for (let i = 0; i < xmlListings.length; i++) {
            let listingData;

            try {
                consoleLog(`[${this.source}] Fetching listing [${i + 1}] from: ${xmlListings[i].url}`);
                listingData = await this.fetchListingDataFromPage(xmlListings[i], browserPage);
            } catch (error) {
                consoleLog(`[${this.source}] Cannot fetch listing data from: ${xmlListings[i].url}`);
                consoleLog(error);
                await browser.close();
                [browser, browserPage] = await this.getNewBrowserAndNewPage();
                await this.dbMarketListings.deleteOne({ id: xmlListings[i].id });
                continue;
            }

            await this.dbMarketListings.updateOne({ id: listingData.id }, { $set: listingData });
            consoleLog(`[${this.source}] Fetched and saved listing successfully. Waiting...`);
            await delay(this.smartRequester.getRandomRestingDelay());
        }

        await browser.close();
        consoleLog(`[${this.source}] Initialization complete.`);
    }
}
