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

            const xmlListings = await this.fetchListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);

            const { deletedListingsIds, deletedListings } = await this.fetchMissingMarketListingsFromXml(xmlListings);

            await this.syncClosedListings(deletedListingsIds, deletedListings);

            await this.syncCurrentMarketListingsFromXml(xmlListings);

            await this.insertTodaySyncStats();

            consoleLog(`[${this.source}] Synchronization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue synchronization due to error:`);
            consoleLog(error);
        }
    }
}
