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

            const xmlListings = await this.fetchLiveListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);
            const initializedListingsIdsSet = await this.fetchInitializedListingsIdsSet();
            const liveListingsToInit = this.getLiveListingsToInit(xmlListings, initializedListingsIdsSet);
            await this.prepareDbForLiveListingsInit(liveListingsToInit, initializedListingsIdsSet);
            await this.handleLiveListingsToInitialize(liveListingsToInit);

            consoleLog(`[${this.source}] Initialization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue initialization due to error:`);
            consoleLog(error);
        }
    }
}
