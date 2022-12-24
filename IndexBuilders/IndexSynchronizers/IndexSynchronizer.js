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
        this.linkedApartmentsUpdatedCount = 0;
    }

    async sync() {
        // To be implemented
    }

    async fetchMissingLiveListingsFromMarket(marketLiveListings) {
        try {
            const dbListingsWithIds = await this.liveListingsSubCollection.find({}, { projection: { _id: 0, id: 1 } });

            const dbListingsIdsSet = new Set(mapObjectsToValueOfKey(dbListingsWithIds, 'id'));
            const marketListingsIdsSet = new Set(mapObjectsToValueOfKey(marketLiveListings, 'id'));

            return [...dbListingsIdsSet].filter((dbListing) => !marketListingsIdsSet.has(dbListing));
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

        this.listingsClosedCount += deletedListingsIds.length;

        consoleLog(`[${this.source}] Synchronized sold listings.`);
    }

    async syncCurrentMarketListingsFromMarket(liveListings, marketLiveListings = []) {
        const liveListingsToCreate = [];

        consoleLog(`[${this.source}] Synchronizing current market listings...`);

        await this.handleLiveListingsToSynchronize(liveListings, liveListingsToCreate, marketLiveListings);

        if (liveListingsToCreate.length > 0) {
            await this.liveListingsSubCollection.insertMany(liveListingsToCreate);
        }

        consoleLog(`[${this.source}] Synchronized current market listings.`);
    }

    async handleLiveListingsToSynchronize(liveListings, liveListingsToCreate, marketLiveListings = []) {
        const dbListingsRecords = await this.liveListingsSubCollection.find({}, { _id: 0, id: 1, lastModified: 1 });
        const dbListingsMap = indexObjectsByKey(dbListingsRecords, 'id');
        const dbListingsIds = new Set(Object.keys(dbListingsMap));

        for (let i = 0; i < liveListings.length; i++) {
            try {
                consoleLog(`[${this.source}] Checking listing ${i+1} of ${liveListings.length}...`);

                const liveListing = liveListings[i];
                const listingId = liveListing.id;
                const wasLiveBefore = dbListingsIds.has(listingId);
                const liveListingDbProps = {
                    id: liveListing.id,
                    url: liveListing.url,
                    lastModified: liveListing.lastModified,
                };

                if (!wasLiveBefore) {
                    await this.createMarketListing(liveListing);
                    liveListingsToCreate.push(liveListingDbProps);
                    marketLiveListings.push(liveListingDbProps);
                    consoleLog(`[${this.source}] Fetched and created listing in database. Waiting...`);
                    await delay(getRandomRestingDelay());
                    continue;
                }

                const dbListing = dbListingsMap[listingId];
                if (dbListing.lastModified < liveListing.lastModified) {
                    await this.updateMarketListing(liveListing);
                    marketLiveListings.push(liveListingDbProps);
                    await this.liveListingsSubCollection.updateOne({ id: listingId }, { $set: liveListingDbProps });
                    consoleLog(`[${this.source}] Fetched and updated listing in database. Waiting...`);
                    await delay(getRandomRestingDelay());
                    continue;
                }

                marketLiveListings.push(liveListingDbProps);
            } catch (error) {
                consoleLog(`[${this.source}] Cannot process live listing.`);
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

            if (error.message === 'Cannot find all listing details.') {
                consoleLog(`[${this.source}] Marking existing listing as sold...`);

                await this.listingsSubCollection.updateOne(
                    { id: liveListing.id },
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

                this.listingsClosedCount++;
            }

            throw error;
        }

        const hasUpdatedListing = await this.updateListingWithApartmentHandlingUsingNewVersionData(newVersionData);

        if (hasUpdatedListing) {
            this.listingsUpdatedCount++;
        }
    }

    async updateListingWithApartmentHandlingUsingNewVersionData(newVersionData) {
        const listing = await this.listingsSubCollection.findOne({ id: newVersionData.id }, {});
        const apartment = await this.apartmentsCollection.findOne({ _id: listing.apartment }, {});

        if (!this.listingVersionSignificantlyChanged(listing, newVersionData)) {
            consoleLog(`[${this.source}] Listing has not significantly changed. No need for update.`);
            return false;
        }

        if (newVersionData.roomsCount !== apartment.roomsCount || newVersionData.hasNewApartment !== apartment.isNew) {
            // Rare case: One of the most important attributes has changed, so must update linked apartment
            consoleLog(`[${this.source}] Updating linked apartment for existing listing...`);
            await this.updateListingWhenLinkedApartmentChanges(listing, apartment, newVersionData);
            this.linkedApartmentsUpdatedCount++;
            return true;
        }

        // Last version is referring to the same apartment as it was referring before the listing's update
        const updatedListing = this.getUpdatedListingWithNewVersionData(listing, newVersionData);

        await this.listingsSubCollection.updateOne({ id: updatedListing.id }, { $set: updatedListing });

        const updatedApartmentImages = this.similarityDetector.getUnionBetweenHashesLists(
            apartment.images,
            updatedListing.images
        );

        await this.updateApartmentById(updatedListing.apartment, { images: updatedApartmentImages });

        return true;
    }

    async insertTodaySyncStats() {
        await this.dbSyncStats.insertOne({
            source: this.source,
            date: getSyncDate(),
            closedListingsCount: this.listingsClosedCount,
            newListingsCount: this.listingsAddedCount,
            updatedListingsCount: this.listingsUpdatedCount,
            updatedLinkedApartmentsCount: this.linkedApartmentsUpdatedCount,
        });
    }
}
