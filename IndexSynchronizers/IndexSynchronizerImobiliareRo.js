import { IndexSynchronizer } from './IndexSynchronizer.js';
import { URL_XML_IMOBILIARE_LISTINGS_BUCHAREST } from '../Constants.js';
import { consoleLog } from '../Helpers/Utils.js';

export class IndexSynchronizerImobiliareRo extends IndexSynchronizer {
    async sync() {
        consoleLog(`[${this.logsSource}] Synchronization started.`);

        const xmlListings = await this.fetchListingsFromXml(URL_XML_IMOBILIARE_LISTINGS_BUCHAREST);

        const { deletedListingsIds, deletedListings } = await this.fetchDeletedListingsFromDbComparedToXml(xmlListings);

        await this.syncClosedListings(deletedListingsIds, deletedListings);

        await this.syncCurrentMarketListingsFromXml(xmlListings);

        consoleLog(`[${this.logsSource}] Synchronization complete.`);
    }
}
