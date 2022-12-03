import { IndexBuilder } from '../IndexBuilders/IndexBuilder.js';
import { consoleLog, indexObjectsByKey, mapObjectsToValueOfKey } from '../Helpers/Utils.js';
import delay from 'delay';
import { SYNCHRONIZATION_TIME } from '../Constants.js';

export class IndexSynchronizer extends IndexBuilder {
    constructor(source, dbCollection, dataExtractor, smartRequester, imageHasher, dbClosedListings, dbSyncStats) {
        super(source, dbCollection, dataExtractor, smartRequester, imageHasher);
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
                continue;
            }

            await this.handleDeletedListingHavingSimilarClosedListing(
                deletedListings[i],
                similarClosedListing,
                listingsToBeClosed
            );
        }
    }

    async fetchSimilarClosedListing(listing) {
        if (!this.dbClosedListingsRecords.length) {
            // Perform only once the query on the db for getting all closed listings
            this.dbClosedListingsRecords = await this.dbClosedListings.find({});
        }

        for (let i = 0; i < this.dbClosedListingsRecords.length; i++) {
            if (this.checkListingsAreSimilar(listing, this.dbClosedListingsRecords[i])) {
                return this.dbClosedListingsRecords[i];
            }
        }

        return null;
    }

    checkListingsAreSimilar(listing1, listing2) {
        // Add safe guard for number of rooms. If different count of rooms, there is no need to look at the images
        if (listing1.roomsCount !== listing2.roomsCount) {
            return false;
        }

        // Apartments have same number of rooms, should check their images now
        return this.imageHasher.checkSimilarityForHashesLists(listing1.images, listing2.images);
    }

    async handleDeletedListingHavingSimilarClosedListing(deletedListing, similarClosedListing) {
        const originalListing = this.getOriginalListing(similarClosedListing, deletedListing);

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

        let [browser, browserPage] = await this.getNewBrowserAndNewPage();

        await this.handleXmlListingsToSynchronize(xmlListings, browser, browserPage, listingsToBeAdded);

        await browser.close();

        if (listingsToBeAdded.length > 0) {
            this.listingsToBeAddedCount = listingsToBeAdded.length;
            await this.dbMarketListings.insertMany(listingsToBeAdded);
        }

        consoleLog(`[${this.source}] Synchronized current market listings.`);
    }

    async handleXmlListingsToSynchronize(xmlListings, browser, browserPage, listingsToBeAdded) {
        const dbMarketListingsRecords = await this.dbMarketListings.find({}, { _id: 0, id: 1, lastModified: 1 });
        const dbMarketListingsMap = indexObjectsByKey(dbMarketListingsRecords, 'id');
        const dbMarketListingsIds = new Set(Object.keys(dbMarketListingsMap));

        for (let i = 0; i < xmlListings.length; i++) {
            try {
                const listingId = xmlListings[i].id;
                const isOnMarket = dbMarketListingsIds.has(listingId);
                if (!isOnMarket) {
                    await this.createMarketListing(xmlListings[i], browserPage, listingsToBeAdded);
                    consoleLog(`[${this.source}] Fetched and added listing to database. Waiting...`);
                    await delay(this.smartRequester.getRandomRestingDelay());
                    continue;
                }

                const marketListing = dbMarketListingsMap[listingId];
                if (marketListing.lastModified < xmlListings[i].lastModified) {
                    await this.updateMarketListing(xmlListings[i], browserPage);
                    consoleLog(`[${this.source}] Fetched and updated listing in database. Waiting...`);
                    await delay(this.smartRequester.getRandomRestingDelay());
                }
            } catch (error) {
                consoleLog(`[${this.source}] Cannot process XML listing.`);
                consoleLog(error);
                [browser, browserPage] = await this.getReloadedBrowser(browser);
            }
        }
    }

    async createMarketListing(listingShortData, browserPage, newMarketListings) {
        let newListingData;

        try {
            consoleLog(`[${this.source}] Fetching to create listing from: ${listingShortData.url}`);
            newListingData = await this.fetchListingDataFromPage(listingShortData, browserPage);
        } catch (error) {
            consoleLog(`[${this.source}] Cannot fetch new listing data from: ${listingShortData.url}`);
            throw error;
        }

        newMarketListings.push(newListingData);
    }

    async updateMarketListing(listingShortData, browserPage) {
        let listingData;

        try {
            consoleLog(`[${this.source}] Fetching to update listing from: ${listingShortData.url}`);
            listingData = await this.fetchListingDataFromPage(listingShortData, browserPage);
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
