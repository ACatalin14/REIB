import {
    SOURCE_TO_DB_COLLECTION_MAP,
    DB_COLLECTION_MARKET_STATS,
    DB_COLLECTION_CLOSED_LISTINGS_STATS,
    DB_COLLECTION_CLOSED_LISTINGS,
} from '../Constants.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { consoleLog } from '../Helpers/Utils.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import { Int32 } from 'mongodb';

export class StatsMaker {
    constructor() {
        // This class is meant to be used only on 1st of any month!
        const yesterday = new Date(new Date() - 24 * 60 * 60 * 1000);
        const month = yesterday.getMonth() + 1;
        const year = yesterday.getFullYear();

        this.referenceMonth = `${month}.${year}`;
        this.dbClient = null;
    }

    async makeStats() {
        this.dbClient = new DbClient();

        consoleLog('[stats] Computing end of month statistics started.');

        await this.connectToDb();

        // await this.makeMarketStats();
        await this.makeClosedListingsStats();
        await this.makeUniqueListingsStats();

        await this.disconnectFromDb();

        consoleLog('[stats] Computing end of month statistics finished.');
    }

    async connectToDb() {
        try {
            consoleLog('[stats] Connecting to the database...');
            await this.dbClient.connect();
        } catch (error) {
            consoleLog(error);
            consoleLog('[stats] Cannot connect to Mongo DB.');
        }
    }

    async disconnectFromDb() {
        try {
            consoleLog('[stats] Disonnecting from the database...');
            await this.dbClient.disconnect();
        } catch (error) {
            consoleLog('[stats] Cannot disconnect from Mongo DB.');
            consoleLog(error);
        }
    }

    async makeMarketStats() {
        consoleLog('[stats] Computing market statistics...');

        const marketStatsCollection = new DbCollection(DB_COLLECTION_MARKET_STATS, this.dbClient);
        const avgResults = [];

        avgResults.push(...(await this.getResultsForMarketCollections()));

        for (const [source, collection] of Object.entries(SOURCE_TO_DB_COLLECTION_MAP)) {
            const listingsCollection = new DbCollection(collection, this.dbClient);
            avgResults.push(...(await this.getResultsForCollection(source, listingsCollection)));
            avgResults.push(...(await this.getResultsForCollectionGroupedByRoomsCount(source, listingsCollection)));
        }

        await marketStatsCollection.insertMany(avgResults);
    }

    async makeClosedListingsStats() {
        consoleLog('[stats] Computing closed listings statistics...');

        const closedListingsStatsCollection = new DbCollection(DB_COLLECTION_CLOSED_LISTINGS_STATS, this.dbClient);
        const closedListingsCollection = new DbCollection(DB_COLLECTION_CLOSED_LISTINGS, this.dbClient);
        const avgResults = [];

        avgResults.push(
            ...(await closedListingsCollection.aggregate([
                { $project: { _id: 0, price: 1, pricePerSurface: 1 } },
                ...this.getStagesForAveragingListings(null, false),
            ]))
        );

        avgResults.push(
            ...(await closedListingsCollection.aggregate([
                { $project: { _id: 0, price: 1, pricePerSurface: 1, roomsCount: 1 } },
                ...this.getStagesForAveragingListings(null, true),
            ]))
        );

        avgResults.push(
            ...(await closedListingsCollection.aggregate([
                { $project: { _id: 0, price: 1, pricePerSurface: 1, source: 1 } },
                ...this.getStagesForAveragingListings(null, false, true),
            ]))
        );

        avgResults.push(
            ...(await closedListingsCollection.aggregate([
                { $project: { _id: 0, price: 1, pricePerSurface: 1, source: 1, roomsCount: 1 } },
                ...this.getStagesForAveragingListings(null, true, true),
            ]))
        );

        await closedListingsStatsCollection.insertMany(avgResults);
    }

    async makeUniqueListingsStats() {}

    async getResultsForMarketCollections() {
        const collectionNames = Object.values(SOURCE_TO_DB_COLLECTION_MAP);
        const firstCollectionName = collectionNames[0];
        const firstCollection = new DbCollection(firstCollectionName, this.dbClient);
        const results = [];

        const unionStages = this.getUnionStages(collectionNames, false);

        results.push(
            ...(await firstCollection.aggregate([
                { $project: { _id: 0, price: 1, pricePerSurface: 1 } },
                ...unionStages,
                ...this.getStagesForAveragingListings(null, false),
            ]))
        );

        const unionStagesWithRoomsCount = this.getUnionStages(collectionNames, true);

        results.push(
            ...(await firstCollection.aggregate([
                { $project: { _id: 0, price: 1, pricePerSurface: 1, roomsCount: 1 } },
                ...unionStagesWithRoomsCount,
                ...this.getStagesForAveragingListings(null, true),
            ]))
        );

        return results;
    }

    getUnionStages(collectionNames, projectRoomsCount) {
        const unionStages = [];
        const projectSubStage = {
            $project: {
                _id: 0,
                price: 1,
                pricePerSurface: 1,
            },
        };

        if (projectRoomsCount) {
            projectSubStage.$project.roomsCount = 1;
        }

        for (let i = 1; i < collectionNames.length; i++) {
            unionStages.push({
                $unionWith: {
                    coll: collectionNames[i],
                    pipeline: [projectSubStage],
                },
            });
        }

        return unionStages;
    }

    async getResultsForCollection(source, listingsCollection) {
        return await listingsCollection.aggregate([
            { $project: { _id: 0, price: 1, pricePerSurface: 1 } },
            ...this.getStagesForAveragingListings(source, false),
        ]);
    }

    async getResultsForCollectionGroupedByRoomsCount(source, listingsCollection) {
        return await listingsCollection.aggregate([
            { $project: { _id: 0, price: 1, pricePerSurface: 1, roomsCount: 1 } },
            ...this.getStagesForAveragingListings(source, true),
        ]);
    }

    getStagesForAveragingListings(commonSource, groupByRoomsCount, groupBySource = false) {
        const [groupStage, setStage, unsetStage] = this.getDefaultStagesForAveragingListings();

        const stages = [groupStage, setStage, unsetStage];

        if (commonSource) {
            setStage.$set.source = commonSource;
        }

        if (groupByRoomsCount) {
            stages.unshift({
                $set: {
                    roomsCount: {
                        $cond: {
                            if: { $lt: ['$roomsCount', 4] },
                            then: '$roomsCount',
                            else: Int32(4),
                        },
                    },
                },
            });

            groupStage.$group._id = '$roomsCount';
            setStage.$set.roomsCount = '$_id';
        }

        if (groupBySource) {
            groupStage.$group._id = '$source';
            setStage.$set.source = '$_id';
        }

        if (groupBySource && groupByRoomsCount) {
            groupStage.$group._id = {
                source: '$source',
                roomsCount: '$roomsCount',
            };
            setStage.$set.roomsCount = '$_id.roomsCount';
            setStage.$set.source = '$_id.source';
        }

        return stages;
    }

    getDefaultStagesForAveragingListings() {
        const groupStage = {
            $group: {
                _id: null,
                avgPrice: { $avg: '$price' },
                avgPricePerSurface: { $avg: '$pricePerSurface' },
            },
        };
        const setStage = {
            $set: {
                avgPrice: { $round: ['$avgPrice', 2] },
                avgPricePerSurface: { $round: ['$avgPricePerSurface', 2] },
                referenceMonth: this.referenceMonth,
            },
        };
        const unsetStage = { $unset: '_id' };

        return [groupStage, setStage, unsetStage];
    }
}
