import { consoleLog, getRandomRestingDelay } from '../../Helpers/Utils.js';
import { IndexInitializer } from './IndexInitializer.js';
import {
    LISTING_PRICE_MIN_THRESHOLD,
    OLX_HIGHEST_MIN_PRICE_FILTER,
    OLX_LISTINGS_PAGE_SIZE,
    OLX_PRICE_FILTER_STEP,
} from '../../Constants.js';
import delay from 'delay';

export class IndexInitializerOlxRo extends IndexInitializer {
    async start() {
        try {
            consoleLog(`[${this.source}] Initialization started.`);

            const initializedListingsIdsSet = await this.fetchInitializedListingsIdsSet();

            // Delete uninitialized listings
            await this.liveListingsSubCollection.deleteMany({ id: { $nin: [...initializedListingsIdsSet] } });

            for (
                let minPrice = LISTING_PRICE_MIN_THRESHOLD;
                minPrice <= OLX_HIGHEST_MIN_PRICE_FILTER;
                minPrice += OLX_PRICE_FILTER_STEP
            ) {
                const maxPrice = minPrice < OLX_HIGHEST_MIN_PRICE_FILTER ? minPrice + OLX_PRICE_FILTER_STEP - 1 : null;
                await this.initializeListingsFromRange(minPrice, maxPrice, initializedListingsIdsSet);
            }

            consoleLog(`[${this.source}] Initialization complete.`);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot continue initialization due to error:`);
            consoleLog(error);
        }
    }

    async initializeListingsFromRange(minPrice, maxPrice, initializedListingsIdsSet) {
        let offset = 0;

        const strMaxPrice = maxPrice ? maxPrice : 'Infinity';
        const range = `${minPrice} - ${strMaxPrice}`;
        let allLiveListingsToInit = [];
        let allListingsToInit = [];

        consoleLog(`[${this.source}] Initializing listings with price between ${range} euros.`);

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

            const liveListingsToInit = this.getLiveListingsToInit(listingsData, initializedListingsIdsSet);

            if (liveListingsToInit.length === 0) {
                offset += OLX_LISTINGS_PAGE_SIZE;
                continue;
            }

            allLiveListingsToInit.push(...liveListingsToInit);

            const listingsToInit = listingsData
                .filter((listing) => !initializedListingsIdsSet.has(listing.id))
                .map((listing) => ({
                    id: listing.id,
                    url: listing.url,
                    lastModified: listing.lastModified,
                    data: listing,
                }));

            allListingsToInit.push(...listingsToInit);

            offset += OLX_LISTINGS_PAGE_SIZE;

            await delay(getRandomRestingDelay());
        }

        if (allLiveListingsToInit.length === 0) {
            // No listings to initialize
            return;
        }

        // remove clones
        allLiveListingsToInit = allLiveListingsToInit.filter((liveListing, index, self) => {
            return index === self.findIndex((l) => l.id === liveListing.id);
        });

        allListingsToInit = allListingsToInit.filter((listing, index, self) => {
            return index === self.findIndex((l) => l.id === listing.id);
        });

        // Insert new listings to initialize
        await this.liveListingsSubCollection.insertMany(allLiveListingsToInit);
        await this.handleLiveListingsToInitialize(allListingsToInit);
        allLiveListingsToInit.forEach((liveListing) => initializedListingsIdsSet.add(liveListing.id));
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
