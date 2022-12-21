import {
    DB_COLLECTION_STATS,
    SOURCE_TO_DB_COLLECTION_MAP,
} from '../Constants.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { consoleLog } from '../Helpers/Utils.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import { Int32 } from 'mongodb';

export class StatsMaker {
    constructor() {
        this.referenceMonth = process.env.STATS_REFERENCE_MONTH;
        this.dbClient = null;
        this.statsCollection = null;
    }

    async makeStats() {
        this.dbClient = new DbClient();

        consoleLog('[stats] Computing end of month statistics started.');

        consoleLog('[stats] Connecting to the database...');
        await this.dbClient.connect();

        this.statsCollection = new DbCollection(DB_COLLECTION_STATS, this.dbClient);

        await this.makeListingsStats();
        await this.makeApartmentsStats();
        await this.makeSoldApartmentsStats();

        consoleLog('[stats] Disconnecting from the database...');
        await this.dbClient.disconnect();

        consoleLog('[stats] Computing end of month statistics finished.');
    }

    async makeListingsStats() {
        consoleLog('[stats] Computing listings statistics...');

        // TODO: Make listings stats
    }

    async makeSoldApartmentsStats() {
        consoleLog('[stats] Computing closed listings statistics...');

        // TODO: Make sold apartments stats
    }

    async makeApartmentsStats() {
        consoleLog('[stats] Computing distinct listings statistics...');

        // TODO: Make apartments stats
    }

    getAveragingPipelinesForMixedCollection() {
        return [
            // Pipeline with average globalized
            [
                { $project: { _id: 0, price: 1, pricePerSurface: 1 } },
                ...this.getStagesForAveragingListings(null, false, false),
            ],
            // Pipeline with average grouped by roomsCount
            [
                { $project: { _id: 0, price: 1, pricePerSurface: 1, roomsCount: 1 } },
                ...this.getStagesForAveragingListings(null, true, false),
            ],
            // Pipeline with average grouped by source
            [
                { $project: { _id: 0, price: 1, pricePerSurface: 1, source: 1 } },
                ...this.getStagesForAveragingListings(null, false, true),
            ],
            // Pipeline with average grouped by roomsCount and by source
            [
                { $project: { _id: 0, price: 1, pricePerSurface: 1, roomsCount: 1, source: 1 } },
                ...this.getStagesForAveragingListings(null, true, true),
            ],
        ];
    }

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
