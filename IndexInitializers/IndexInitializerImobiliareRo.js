import delay from 'delay';
import { consoleLog } from '../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import { URL_XML_IMOBILIARE_LISTINGS_BUCHAREST } from '../Constants.js';

export class IndexInitializerImobiliareRo extends IndexInitializer {
    async start() {
        const xmlListings = await this.fetchListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);

        consoleLog('Inserting listings short data to database...')
        await this.dbMarketListings.insertMany(xmlListings);
        consoleLog('Inserted to database.')

        let browser, browserPage;

        try {
            [browser, browserPage] = await this.getNewBrowserAndNewPage();
            consoleLog(`[${this.logsSource}] Launched headless browser.`);
        } catch (error) {
            consoleLog(`[${this.logsSource}] Cannot launch headless browser.`);
            consoleLog(error);
            throw error;
        }

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
