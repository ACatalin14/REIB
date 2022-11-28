import delay from 'delay';
import { consoleLog } from '../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import { URL_XML_IMOBILIARE_LISTINGS_BUCHAREST } from '../Constants.js';

export class IndexInitializerImobiliareRo extends IndexInitializer {
    async start() {
        const xmlListings = await this.fetchListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);

        await this.dbMarketListings.insertMany(xmlListings);

        let [browser, browserPage] = await this.getNewBrowserAndNewPage();

        for (let i = 0; i < xmlListings.length; i++) {
            let listingData;

            try {
                listingData = await this.fetchListingDataFromPage(xmlListings[i], browserPage);
                consoleLog(`[${this.logsSource}] Fetched successfully listing data from: ${xmlListings[i].id}`);
            } catch (error) {
                consoleLog(`[${this.logsSource}] Cannot fetch listing data from: ${xmlListings[i].id}`);
                consoleLog(error);
                await browser.close();
                [browser, browserPage] = await this.getNewBrowserAndNewPage();
                await this.dbMarketListings.deleteOne({ id: xmlListings[i].id });
                continue;
            }

            await this.dbMarketListings.updateOne({ id: listingData.id }, { $set: listingData });
            await delay(this.smartRequester.getRandomRestingDelay());
        }

        await browser.close();
        consoleLog(`[${this.logsSource}] Initialization complete.`);
    }
}
