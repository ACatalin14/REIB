import { IndexSynchronizer } from './IndexSynchronizer.js';
import { URL_XML_IMOBILIARE_LISTINGS_BUCHAREST } from '../../Constants.js';
import { consoleLog } from '../../Helpers/Utils.js';

export class IndexSynchronizerImobiliareRo extends IndexSynchronizer {
    getListingIdFromUrl(url) {
        const lastDashIndex = url.lastIndexOf('-');
        return url.slice(lastDashIndex + 1);
    }

    async sync() {
        try {
            consoleLog(`[${this.source}] Synchronization started.`);

            const liveListings = await this.fetchLiveListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);

            const deletedListingsIds = await this.fetchMissingLiveListingsFromXml(liveListings);

            await this.syncClosedListings(deletedListingsIds);

            await this.syncCurrentMarketListingsFromXml(liveListings);

            await this.insertTodaySyncStats();

            consoleLog(`[${this.source}] Synchronization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue synchronization due to error:`);
            consoleLog(error);
        }
    }
}
