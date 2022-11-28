import { IndexBuilder } from '../IndexBuilders/IndexBuilder.js';
import { consoleLog, mapObjectsToValueOfKey } from '../Helpers/Utils.js';
import delay from 'delay';

export class IndexSynchronizer extends IndexBuilder {
    constructor(logsSource, dbCollection, dataExtractor, smartRequester, imageHasher, dbClosedListings) {
        super(logsSource, dbCollection, dataExtractor, smartRequester, imageHasher);
        this.dbClosedListings = dbClosedListings;
        this.dbClosedListingsRecords = [];
    }

    async sync() {
        // To be implemented
    }

    async fetchDeletedListingsFromDbComparedToXml(xmlListings) {
        const dbListingsWithIds = await this.dbMarketListings.find({}, { projection: { _id: 0, id: 1 } });

        const dbListingsIdsSet = new Set(mapObjectsToValueOfKey(dbListingsWithIds, 'id'));
        const xmlListingsIdsSet = new Set(mapObjectsToValueOfKey(xmlListings, 'id'));

        const deletedListingsIds = [...dbListingsIdsSet].filter((dbListing) => !xmlListingsIdsSet.has(dbListing));

        const deletedListings = await this.dbMarketListings.find({ id: { $in: deletedListingsIds } });

        return { deletedListingsIds, deletedListings };
    }

    async syncClosedListings(deletedListingsIds, deletedListings) {
        let listingsToBeClosed = [];

        for (let i = 0; i < deletedListings.length; i++) {
            const similarClosedListing = await this.fetchSimilarClosedListing(deletedListings[i]);

            if (!similarClosedListing) {
                const closedListing = { ...deletedListings[i], closedDate: new Date() };
                listingsToBeClosed.push(closedListing);
            } else {
                await this.handleDeletedListingHavingSimilarClosedListing(deletedListings[i], similarClosedListing);
            }
        }

        const dbOperations = [this.dbMarketListings.deleteMany({ id: { $in: deletedListingsIds } })];

        if (listingsToBeClosed.length > 0) {
            this.dbClosedListingsRecords.push(...listingsToBeClosed);
            dbOperations.push(this.dbClosedListings.insertMany(listingsToBeClosed));
        }

        await Promise.all(dbOperations);

        consoleLog(`[${this.logsSource}] Synchronized closed listings.`);
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
        this.dbClosedListingsRecords[indexToUpdate] = originalListing;
        await this.dbClosedListings.updateOne({ id: similarClosedListing.id }, { $set: originalListing });
    }

    async syncCurrentMarketListingsFromXml(xmlListings) {
        let listingsToBeAdded = [];

        let [browser, browserPage] = await this.getNewBrowserAndNewPage();

        for (let i = 0; i < xmlListings.length; i++) {
            try {
                const dbListing = await this.dbMarketListings.findOne({ id: xmlListings[i].id });

                if (!dbListing) {
                    await this.createMarketListing(xmlListings[i], browserPage, listingsToBeAdded);
                    await delay(this.smartRequester.getRandomRestingDelay());
                    continue;
                }

                if (dbListing.lastModified < xmlListings[i].lastModified) {
                    await this.updateMarketListing(xmlListings[i], browserPage);
                    await delay(this.smartRequester.getRandomRestingDelay());
                }
            } catch (error) {
                consoleLog(error);
                await browser.close();
                [browser, browserPage] = await this.getNewBrowserAndNewPage();
            }

        }

        await browser.close();

        if (listingsToBeAdded.length > 0) {
            await this.dbMarketListings.insertMany(listingsToBeAdded);
        }

        consoleLog(`[${this.logsSource}] Synchronized current market listings.`);
    }

    async createMarketListing(listingShortData, browserPage, newMarketListings) {
        let newListingData;

        try {
            consoleLog('Creating new listing...');
            newListingData = await this.fetchListingDataFromPage(listingShortData, browserPage);
        } catch (error) {
            consoleLog(`[${this.logsSource}] Cannot fetch new listing data from: ${listingShortData.id}`);
            throw error;
        }

        newMarketListings.push(newListingData);
    }

    async updateMarketListing(listingShortData, browserPage) {
        let listingData;

        try {
            consoleLog('Updating listing...');
            listingData = await this.fetchListingDataFromPage(listingShortData, browserPage);
        } catch (error) {
            consoleLog(`[${this.logsSource}] Cannot fetch updated listing data from: ${listingShortData.id}`);
            throw error;
        }

        await this.dbMarketListings.updateOne({ id: listingData.id }, { $set: listingData });
    }

    // TODO: Discuss whether this approach is ok: original listing is the cheaper one by price,
    //       or the one with higher surface, or more images
    getOriginalListing(listing1, listing2) {
        // Mainly look at the listings' prices, and select the cheaper one (this is what the buyers look into the most)
        if (listing1.price < listing2.price) {
            return listing1;
        }

        if (listing2.price < listing1.price) {
            return listing2;
        }

        // When prices are equal, look at the surface, and select the bigger one by this criteria
        if (listing1.surface > listing2.surface) {
            return listing1;
        }

        if (listing2.surface > listing1.surface) {
            return listing2;
        }

        // In the rare cases when both prices and surfaces are the same, select the one with more images
        if (listing1.images.length >= listing2.images.length) {
            // Also return the first listing when listings are truly equal
            return listing1;
        }

        return listing2;
    }
}
