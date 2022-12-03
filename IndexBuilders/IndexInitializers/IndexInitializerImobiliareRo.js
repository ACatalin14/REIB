import { consoleLog } from '../../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import { URL_XML_IMOBILIARE_LISTINGS_BUCHAREST } from '../../Constants.js';

export class IndexInitializerImobiliareRo extends IndexInitializer {
    getListingIdFromUrl(url) {
        const lastDashIndex = url.lastIndexOf('-');
        return url.slice(lastDashIndex + 1);
    }

    async start() {
        try {
            consoleLog(`[${this.source}] Initialization started.`);

            const xmlListings = await this.fetchListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);
            const xmlListingsToInit = await this.getXmlListingsToInit(xmlListings);
            await this.prepareListingsToInit(xmlListingsToInit);

            let browser, browserPage;

            [browser, browserPage] = await this.getNewBrowserAndNewPage();

            await this.handleXmlListingsToInitialize(xmlListingsToInit, browser, browserPage);

            await browser.close();

            consoleLog(`[${this.source}] Initialization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue initialization due to error:`);
            consoleLog(error);
        }
    }
}
