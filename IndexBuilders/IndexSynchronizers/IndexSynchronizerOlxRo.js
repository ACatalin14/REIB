import { IndexSynchronizer } from './IndexSynchronizer.js';
import {
    LISTING_PRICE_MIN_THRESHOLD,
    OLX_HIGHEST_MIN_PRICE_FILTER,
    OLX_LISTINGS_PAGE_SIZE,
    OLX_PRICE_FILTER_STEP,
} from '../../Constants.js';
import { consoleLog, getRandomRestingDelay } from '../../Helpers/Utils.js';
import delay from 'delay';

export class IndexSynchronizerOlxRo extends IndexSynchronizer {
    async sync() {
        try {
            consoleLog(`[${this.source}] Synchronization started.`);

            const marketLiveListings = [];

            for (
                let minPrice = LISTING_PRICE_MIN_THRESHOLD;
                minPrice <= OLX_HIGHEST_MIN_PRICE_FILTER;
                minPrice += OLX_PRICE_FILTER_STEP
            ) {
                const maxPrice = minPrice < OLX_HIGHEST_MIN_PRICE_FILTER ? minPrice + OLX_PRICE_FILTER_STEP - 1 : null;
                await this.syncCurrentMarketListingsFromRange(minPrice, maxPrice, marketLiveListings);
            }

            const deletedListingsIds = await this.fetchMissingLiveListingsFromMarket(marketLiveListings);

            await this.syncClosedListings(deletedListingsIds);

            await this.insertTodaySyncStats();

            consoleLog(`[${this.source}] Synchronization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue synchronization due to error:`);
            consoleLog(error);
        }
    }

    async syncCurrentMarketListingsFromRange(minPrice, maxPrice, marketLiveListings) {
        let offset = 0;
        const strMaxPrice = maxPrice ? maxPrice : 'Infinity';
        const range = `${minPrice} - ${strMaxPrice}`;
        const liveListingsToSync = [];
        const currentMarketLiveListings = [];

        consoleLog(`[${this.source}] Fetching live listings with price between ${range} euros.`);

        while (true) {
            let listingsData;

            try {
                listingsData = await this.fetchListingsDataFromOlxApi(minPrice, maxPrice, offset);
            } catch (error) {
                consoleLog(`[${this.source}] Retrying in 30 seconds. Cannot fetch listings data between ${minPrice} - ${maxPrice} euros (offset: ${offset}) from OLX due to error:`);
                consoleLog(error);
                await delay(30000);
                continue;
            }

            if (listingsData.length === 0) {
                break;
            }

            const liveListingsChunk = listingsData.map((listing) => ({
                id: listing.id,
                url: listing.url,
                lastModified: listing.lastModified,
                data: listing,
            }));

            liveListingsToSync.push(...liveListingsChunk);

            offset += OLX_LISTINGS_PAGE_SIZE;

            await delay(getRandomRestingDelay());
        }

        consoleLog(`[${this.source}] Synchronizing listings with price between ${range} euros.`);

        if (liveListingsToSync.length === 0) {
            return;
        }

        await this.syncCurrentMarketListingsFromMarket(liveListingsToSync, currentMarketLiveListings);

        marketLiveListings.push(...currentMarketLiveListings);
    }

    async fetchVersionDataAndImageUrls(liveListing) {
        this.dataExtractor.setDataSource(liveListing.data);

        const versionDetails = this.getVersionDetailsWithExtractor(liveListing);

        const imageUrls = this.dataExtractor.extractImageUrls();

        return {
            ...versionDetails,
            imageUrls: imageUrls,
        };
    }
}
