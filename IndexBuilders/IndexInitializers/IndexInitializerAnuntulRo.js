import { consoleLog } from '../../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import {
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_1,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_2,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_3,
    URL_XML_ANUNTUL_LISTINGS_BUCHAREST_4,
} from '../../Constants.js';

export class IndexInitializerAnuntulRo extends IndexInitializer {
    getListingIdFromUrl(url) {
        const lastDashIndex = url.lastIndexOf('-');
        return url.slice(lastDashIndex + 1);
    }

    async start() {
        try {
            consoleLog(`[${this.source}] Initialization started.`);

            const xmlListingsOneRoom = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_1);
            const xmlListingsTwoRooms = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_2);
            const xmlListingsThreeRooms = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_3);
            const xmlListingsManyRooms = await this.fetchLiveListingsFromXml(URL_XML_ANUNTUL_LISTINGS_BUCHAREST_4);

            const xmlListings = [
                ...xmlListingsOneRoom,
                ...xmlListingsTwoRooms,
                ...xmlListingsThreeRooms,
                ...xmlListingsManyRooms,
            ];

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
