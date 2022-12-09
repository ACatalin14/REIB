import { IndexBuilder } from '../IndexBuilder.js';
import { consoleLog, getRandomRestingDelay, indexObjectsByKey, mapObjectsToValueOfKey } from '../../Helpers/Utils.js';
import delay from 'delay';
import { SYNCHRONIZATION_TIME } from '../../Constants.js';

export class IndexSynchronizer extends IndexBuilder {
    constructor(
        source,
        dbCollection,
        dataExtractor,
        smartRequester,
        imageHasher,
        similarityDetector,
        dbClosedListings,
        dbSyncStats
    ) {
        super(source, dbCollection, dataExtractor, smartRequester, imageHasher);
        this.similarityDetector = similarityDetector;
        this.dbClosedListings = dbClosedListings;
        this.dbSyncStats = dbSyncStats;
        this.dbClosedListingsRecords = [];
        this.listingsToBeClosedCount = 0;
        this.listingsToBeAddedCount = 0;
        this.listingsToBeUpdatedCount = 0;
    }

    async sync() {
        // To be implemented
    }

    async fetchMissingMarketListingsFromXml(xmlListings) {
        try {
            const dbListingsWithIds = await this.dbMarketListings.find({}, { projection: { _id: 0, id: 1 } });

            const dbListingsIdsSet = new Set(mapObjectsToValueOfKey(dbListingsWithIds, 'id'));
            const xmlListingsIdsSet = new Set(mapObjectsToValueOfKey(xmlListings, 'id'));

            const deletedListingsIds = [...dbListingsIdsSet].filter((dbListing) => !xmlListingsIdsSet.has(dbListing));

            const deletedListings = await this.dbMarketListings.find({ id: { $in: deletedListingsIds } });

            return { deletedListingsIds, deletedListings };
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch deleted listings from database.`);
            throw error;
        }
    }

    async syncClosedListings(deletedListingsIds, deletedListings) {
        let listingsToBeClosed = [];

        consoleLog(`[${this.source}] Synchronizing closed listings...`);

        this.dbClosedListingsRecords = await this.dbClosedListings.find();

        await this.handleDeletedListings(deletedListings, listingsToBeClosed);

        const dbOperations = [this.dbMarketListings.deleteMany({ id: { $in: deletedListingsIds } })];

        if (listingsToBeClosed.length > 0) {
            this.dbClosedListingsRecords.push(...listingsToBeClosed);
            dbOperations.push(this.dbClosedListings.insertMany(listingsToBeClosed));
            this.listingsToBeClosedCount = listingsToBeClosed.length;
        }

        await Promise.all(dbOperations);

        consoleLog(`[${this.source}] Synchronized closed listings.`);
    }

    async handleDeletedListings(deletedListings, listingsToBeClosed) {
        for (let i = 0; i < deletedListings.length; i++) {
            const similarClosedListing = await this.fetchSimilarClosedListing(deletedListings[i]);

            if (!similarClosedListing) {
                const closedListing = { ...deletedListings[i], closedDate: new Date(), source: this.source };
                listingsToBeClosed.push(closedListing);
                this.dbClosedListingsRecords.push(closedListing);
                continue;
            }

            await this.handleDeletedListingHavingSimilarClosedListing(deletedListings[i], similarClosedListing);
        }
    }

    async fetchSimilarClosedListing(listing) {
        for (let i = 0; i < this.dbClosedListingsRecords.length; i++) {
            if (this.similarityDetector.checkListingsAreSimilar(listing, this.dbClosedListingsRecords[i])) {
                return this.dbClosedListingsRecords[i];
            }
        }

        return null;
    }

    async handleDeletedListingHavingSimilarClosedListing(deletedListing, similarClosedListing) {
        const originalListing = this.similarityDetector.getOriginalListing(similarClosedListing, deletedListing);

        if (originalListing.id === similarClosedListing.id) {
            return;
        }

        const indexToUpdate = this.dbClosedListingsRecords.findIndex(
            (listing) => listing.id === similarClosedListing.id
        );

        originalListing.closedDate = new Date();
        originalListing.source = this.source;
        this.dbClosedListingsRecords[indexToUpdate] = originalListing;
        await this.dbClosedListings.updateOne({ id: similarClosedListing.id }, { $set: originalListing });
    }

    async syncCurrentMarketListingsFromXml(xmlListings) {
        let listingsToBeAdded = [];

        consoleLog(`[${this.source}] Synchronizing current market listings...`);

        await this.handleXmlListingsToSynchronize(xmlListings, listingsToBeAdded);

        if (listingsToBeAdded.length > 0) {
            this.listingsToBeAddedCount = listingsToBeAdded.length;
            await this.dbMarketListings.insertMany(listingsToBeAdded);
        }

        consoleLog(`[${this.source}] Synchronized current market listings.`);
    }

    async handleXmlListingsToSynchronize(xmlListings, listingsToBeAdded) {
        const dbMarketListingsRecords = await this.dbMarketListings.find({}, { _id: 0, id: 1, lastModified: 1 });
        const dbMarketListingsMap = indexObjectsByKey(dbMarketListingsRecords, 'id');
        const dbMarketListingsIds = new Set(Object.keys(dbMarketListingsMap));

        for (let i = 0; i < xmlListings.length; i++) {
            try {
                const listingId = xmlListings[i].id;
                const isOnMarket = dbMarketListingsIds.has(listingId);
                if (!isOnMarket) {
                    await this.createMarketListing(xmlListings[i], listingsToBeAdded);
                    consoleLog(`[${this.source}] Fetched and added listing to database. Waiting...`);
                    await delay(getRandomRestingDelay());
                    continue;
                }

                const marketListing = dbMarketListingsMap[listingId];
                if (marketListing.lastModified < xmlListings[i].lastModified) {
                    await this.updateMarketListing(xmlListings[i]);
                    consoleLog(`[${this.source}] Fetched and updated listing in database. Waiting...`);
                    await delay(getRandomRestingDelay());
                }
            } catch (error) {
                consoleLog(`[${this.source}] Cannot process XML listing.`);
                consoleLog(error);
            }
        }
    }

    async createMarketListing(listingShortData, newMarketListings) {
        let newListingData;

        try {
            consoleLog(`[${this.source}] Fetching to create listing from: ${listingShortData.url}`);
            newListingData = await this.fetchListingDataFromPage(listingShortData);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch new listing data from: ${listingShortData.url}`);
            throw error;
        }

        newMarketListings.push(newListingData);
    }

    async updateMarketListing(listingShortData) {
        let listingData;

        try {
            consoleLog(`[${this.source}] Fetching to update listing from: ${listingShortData.url}`);
            listingData = await this.fetchListingDataFromPage(listingShortData);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch updated listing data from: ${listingShortData.url}`);
            throw error;
        }

        this.listingsToBeUpdatedCount++;
        await this.dbMarketListings.updateOne({ id: listingData.id }, { $set: listingData });
    }

    async insertTodaySyncStats() {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const syncDate = new Date(`2022-${month}-${day} ${SYNCHRONIZATION_TIME}`);

        await this.dbSyncStats.insertOne({
            source: this.source,
            date: syncDate,
            closedListingsCount: this.listingsToBeClosedCount,
            newListingsCount: this.listingsToBeAddedCount,
            updatedListingsCount: this.listingsToBeUpdatedCount,
        });
    }
}
