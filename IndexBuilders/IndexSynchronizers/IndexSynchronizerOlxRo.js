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
    getListingIdFromUrl(url) {
        const lastDashIndex = url.lastIndexOf('-');
        return url.slice(lastDashIndex + 1);
    }

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
        consoleLog(`[${this.source}] Synchronizing listings with price between ${range} euros.`);

        while (true) {
            const listingsData = await this.fetchListingsDataFromOlxApi(minPrice, maxPrice, offset);

            if (listingsData.length === 0) {
                return;
            }

            consoleLog(`[${this.source}] Synchronizing page ${1 + offset / OLX_LISTINGS_PAGE_SIZE} (${range}).`);

            const liveListingsChunk = listingsData.map((listing) => ({
                id: listing.id,
                url: listing.url,
                lastModified: listing.lastModified,
                data: listing,
            }));

            const newMarketLiveListings = [];

            await this.syncCurrentMarketListingsFromMarket(liveListingsChunk, newMarketLiveListings);

            marketLiveListings.push(...newMarketLiveListings);

            offset += OLX_LISTINGS_PAGE_SIZE;

            await delay(getRandomRestingDelay());
        }
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
