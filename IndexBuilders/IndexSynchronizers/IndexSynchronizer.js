import { IndexBuilder } from '../IndexBuilder.js';
import {
    consoleLog,
    getRandomRestingDelay,
    getSyncDate,
    indexObjectsByKey,
    mapObjectsToValueOfKey,
} from '../../Helpers/Utils.js';
import delay from 'delay';

export class IndexSynchronizer extends IndexBuilder {
    constructor(
        source,
        apartmentsCollection,
        listingsSubCollection,
        liveListingsSubCollection,
        dataExtractor,
        smartRequester,
        imageHasher,
        similarityDetector,
        dbSyncStats
    ) {
        super(
            source,
            apartmentsCollection,
            listingsSubCollection,
            liveListingsSubCollection,
            dataExtractor,
            smartRequester,
            imageHasher,
            similarityDetector
        );
        this.dbSyncStats = dbSyncStats;
        this.listingsClosedCount = 0;
        this.listingsAddedCount = 0;
        this.listingsUpdatedCount = 0;
    }

    async sync() {
        // To be implemented
    }

    async fetchMissingLiveListingsFromXml(xmlListings) {
        try {
            const dbListingsWithIds = await this.liveListingsSubCollection.find({}, { projection: { _id: 0, id: 1 } });

            const dbListingsIdsSet = new Set(mapObjectsToValueOfKey(dbListingsWithIds, 'id'));
            const xmlListingsIdsSet = new Set(mapObjectsToValueOfKey(xmlListings, 'id'));

            return [...dbListingsIdsSet].filter((dbListing) => !xmlListingsIdsSet.has(dbListing));
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch deleted listings from database.`);
            throw error;
        }
    }

    async syncClosedListings(deletedListingsIds) {
        consoleLog(`[${this.source}] Synchronizing closed listings...`);

        await this.listingsSubCollection.updateMany(
            { id: { $in: deletedListingsIds } },
            {
                $set: {
                    'versions.$[listingVersion].closeDate': getSyncDate(),
                    'versions.$[listingVersion].sold': true,
                },
            },
            {
                arrayFilters: [{ 'listingVersion.closeDate': null }],
            }
        );

        consoleLog(`[${this.source}] Synchronizing closed live listings...`);

        await this.liveListingsSubCollection.deleteMany({ id: { $in: deletedListingsIds } });

        this.listingsClosedCount = deletedListingsIds.length;

        consoleLog(`[${this.source}] Synchronized sold listings.`);
    }

    async syncCurrentMarketListingsFromXml(liveListings) {
        const liveListingsToCreate = [];

        consoleLog(`[${this.source}] Synchronizing current market listings...`);

        await this.handleLiveListingsToSynchronize(liveListings, liveListingsToCreate);

        if (liveListingsToCreate.length > 0) {
            await this.liveListingsSubCollection.insertMany(liveListingsToCreate);
        }

        consoleLog(`[${this.source}] Synchronized current market listings.`);
    }

    async handleLiveListingsToSynchronize(liveListings, liveListingsToCreate) {
        const dbListingsRecords = await this.liveListingsSubCollection.find({}, { _id: 0, id: 1, lastModified: 1 });
        const dbListingsMap = indexObjectsByKey(dbListingsRecords, 'id');
        const dbListingsIds = new Set(Object.keys(dbListingsMap));

        for (let i = 0; i < liveListings.length; i++) {
            try {
                const liveListing = liveListings[i];
                const listingId = liveListing.id;
                const wasLiveBefore = dbListingsIds.has(listingId);

                if (!wasLiveBefore) {
                    await this.createMarketListing(liveListing);
                    liveListingsToCreate.push(liveListing);
                    consoleLog(`[${this.source}] Fetched and created listing in database. Waiting...`);
                    await delay(getRandomRestingDelay());
                    continue;
                }

                const dbListing = dbListingsMap[listingId];
                if (dbListing.lastModified < liveListing.lastModified) {
                    await this.updateMarketListing(liveListing);
                    await this.liveListingsSubCollection.updateOne({ id: listingId }, { $set: liveListing });
                    consoleLog(`[${this.source}] Fetched and updated listing in database. Waiting...`);
                    await delay(getRandomRestingDelay());
                }
            } catch (error) {
                consoleLog(`[${this.source}] Cannot process XML listing.`);
                consoleLog(error);
            }
        }
    }

    async createMarketListing(liveListing) {
        let versionData;

        try {
            consoleLog(`[${this.source}] Fetching to create listing from: ${liveListing.url}`);
            versionData = await this.fetchVersionDataFromLiveListing(liveListing);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch new listing data from: ${liveListing.url}`);
            throw error;
        }

        await this.createNewListingWithApartmentHandlingFromVersionData(versionData);
        this.listingsAddedCount++;
    }

    async updateMarketListing(liveListing) {
        let newVersionData;

        try {
            consoleLog(`[${this.source}] Fetching to update listing from: ${liveListing.url}`);
            newVersionData = await this.fetchVersionDataFromLiveListing(liveListing);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch updated listing data from: ${liveListing.url}`);
            throw error;
        }

        const hasUpdatedListing = await this.updateListingWithApartmentHandlingUsingNewVersionData(newVersionData);

        if (hasUpdatedListing) {
            this.listingsUpdatedCount++;
        }
    }

    async insertTodaySyncStats() {
        await this.dbSyncStats.insertOne({
            source: this.source,
            date: getSyncDate(),
            closedListingsCount: this.listingsClosedCount,
            newListingsCount: this.listingsAddedCount,
            updatedListingsCount: this.listingsUpdatedCount,
        });
    }
}
