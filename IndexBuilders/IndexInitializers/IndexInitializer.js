import { IndexBuilder } from '../IndexBuilder.js';
import { consoleLog, getRandomRestingDelay, mapObjectsToValueOfKey } from '../../Helpers/Utils.js';
import delay from 'delay';

export class IndexInitializer extends IndexBuilder {
    async start() {
        // To be implemented
    }

    async fetchInitializedListingsIdsSet() {
        const initializedListingsRecords = await this.listingsSubCollection.find({}, { projection: { _id: 0, id: 1 } });
        return new Set(mapObjectsToValueOfKey(initializedListingsRecords, 'id'));
    }

    getLiveListingsToInit(listings, initializedListingsIdsSet) {
        return listings
            .filter((listing) => !initializedListingsIdsSet.has(listing.id))
            .map((listing) => ({
                id: listing.id,
                url: listing.url,
                lastModified: listing.lastModified,
            }));
    }

    async prepareDbForLiveListingsInit(liveListings, initializedListingsIdsSet) {
        consoleLog(`[${this.source}] Preparing database for ${liveListings.length} listings to initialize...`);

        // Delete uninitialized listings
        await this.liveListingsSubCollection.deleteMany({ id: { $nin: [...initializedListingsIdsSet] } });

        // Insert new listings to initialize
        await this.liveListingsSubCollection.insertMany(liveListings);

        consoleLog(`[${this.source}] Listings prepared for initialization.`);
    }

    async handleLiveListingsToInitialize(liveListings) {
        for (let i = 0; i < liveListings.length; i++) {
            let versionData;

            try {
                consoleLog(`[${this.source}] Fetching listing [${i + 1}] from: ${liveListings[i].url}`);
                versionData = await this.fetchVersionDataFromLiveListing(liveListings[i]);
            } catch (error) {
                consoleLog(`[${this.source}] Cannot fetch listing data.`);
                consoleLog(error);
                await this.liveListingsSubCollection.deleteOne({ id: liveListings[i].id });
                continue;
            }

            await this.createNewListingWithApartmentHandlingFromVersionData(versionData);

            consoleLog(`[${this.source}] Fetched and saved listing successfully. Waiting...`);
            await delay(getRandomRestingDelay());
        }
    }
}
