import { IndexSynchronizer } from './IndexSynchronizer.js';
import {
    RETRY_IMAGES_FETCH_ANUNTUL_DELAY,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_1,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_2,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_3,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_4,
} from '../../Constants.js';
import { callUntilSuccess, consoleLog } from '../../Helpers/Utils.js';

export class IndexSynchronizerAnuntulRo extends IndexSynchronizer {
    getListingIdFromUrl(url) {
        const lastDashIndex = url.lastIndexOf('-');
        return url.slice(lastDashIndex + 1);
    }

    async sync() {
        try {
            consoleLog(`[${this.source}] Synchronization started.`);

            const xmlListingsOneRoom = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_1);
            const xmlListingsTwoRooms = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_2);
            const xmlListingsThreeRooms = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_3);
            const xmlListingsManyRooms = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_4);

            const liveListings = [
                ...xmlListingsOneRoom,
                ...xmlListingsTwoRooms,
                ...xmlListingsThreeRooms,
                ...xmlListingsManyRooms,
            ];

            const deletedListingsIds = await this.fetchMissingLiveListingsFromMarket(liveListings);

            await this.syncClosedListings(deletedListingsIds);

            await this.syncCurrentMarketListingsFromMarket(liveListings);

            await this.insertTodaySyncStats();

            consoleLog(`[${this.source}] Synchronization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue synchronization due to error:`);
            consoleLog(error);
        }
    }

    async fetchVersionDataFromLiveListing(liveListing) {
        const versionData = await this.fetchVersionDataAndImageUrls(liveListing);

        versionData.images = await callUntilSuccess(
            this.fetchBinHashesFromUrls.bind(this),
            [versionData.imageUrls],
            `[${this.source}] Cannot fetch all images due to possible bot detection.`,
            RETRY_IMAGES_FETCH_ANUNTUL_DELAY,
            3
        );

        delete versionData.imageUrls;

        return versionData;
    }
}
