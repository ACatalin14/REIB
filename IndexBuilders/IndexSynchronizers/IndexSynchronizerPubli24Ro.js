import { IndexSynchronizer } from './IndexSynchronizer.js';
import { consoleLog } from '../../Helpers/Utils.js';

export class IndexSynchronizerPubli24Ro extends IndexSynchronizer {
    async sync() {
        try {
            consoleLog(`[${this.source}] Synchronization started.`);

            const liveListings = await this.fetchLiveListingsFromPubli24MainSite(true);

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

    checkListingIsOutdated(lastKnownVersionDate, liveVersionDate) {
        const lastMonth = lastKnownVersionDate.getMonth() + 1;
        const lastDay = lastKnownVersionDate.getDate();
        const liveMonth = liveVersionDate.getMonth() + 1;
        const liveDay = liveVersionDate.getDate();

        // Consider the listing to be up-to-date if day and month are the same,
        // since fetched live listings contain only {dd month}
        return lastMonth !== liveMonth || lastDay !== liveDay;
    }
}
