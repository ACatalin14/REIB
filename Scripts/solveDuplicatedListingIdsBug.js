/**
 * This script is meant to solve a bug in which listings that were updated for resell, were
 * updated only in the listings and apartments collections correctly, but in the liveListings
 * collection no new entry was created. An updateOne was trying to work on liveListings,
 * when in fact an insertOne should have been used
 *
 * Solution: Unify all of the listing entries from listings collection that have same id and url fields,
 * by merging their versions + Update the apartments collection by removing unnecessary links +
 * Remove duplicated listings
 *
 * Required ENV variables
 * ======================
 * MONGODB_USERNAME = "username"
 * MONGODB_PASSWORD = "password"
 * USE_TEST_DB = "false"
 */

import { DbClient } from '../DbLayer/DbClient.js';
import { config } from 'dotenv';
import { DbCollection } from '../DbLayer/DbCollection.js';
import { DB_COLLECTION_APARTMENTS, DB_COLLECTION_LISTINGS } from '../Constants.js';
import { consoleLog } from '../Helpers/Utils.js';
import { ObjectId } from 'mongodb';

config(); // Use Environment Variables

async function main() {
    const dbClient = new DbClient();
    await dbClient.connect();

    // 302 080 listings => 237 897 listings (after insert unified and delete duplicates)
    // 44 844 unique ids@urls that are duplicated

    const listingsCollection = new DbCollection(DB_COLLECTION_LISTINGS, dbClient);
    const apartmentsCollection = new DbCollection(DB_COLLECTION_APARTMENTS, dbClient);

    const duplicatedListings = await fetchDuplicatedListings(listingsCollection);

    const unifiedListings = await insertUnifiedUniqueListings(listingsCollection, duplicatedListings);

    const deletedListingsIds = await deleteDuplicatedListings(listingsCollection, duplicatedListings);

    await updateApartmentLinks(apartmentsCollection, deletedListingsIds, unifiedListings);
    // await updateApartmentLinks2(listingsCollection, apartmentsCollection);

    await fixUnifiedListingsImages(listingsCollection);

    await dbClient.disconnect();

    consoleLog('Done.');
}

async function fetchDuplicatedListings(listingsCollection) {
    consoleLog('Fetching duplicated listings...');

    // Fetch listings with same ID and URL, in 2 minutes 8 secs for 301 092 listings
    let listings = await listingsCollection.find({}, {});

    listings = indexListingsByIdAndUrl(listings);

    listings = Object.values(listings).filter((duplicatedListings) => duplicatedListings.length > 1);

    // Return at least 69 084 (69k pure duplicates + the originals)
    return listings;
}

async function insertUnifiedUniqueListings(listingsCollection, duplicatedListings) {
    consoleLog('Computing and inserting unified listings...');

    const unifiedListings = [];

    for (let i = 0; i < duplicatedListings.length; i++) {
        const unifiedListing = computeBaseListingFieldsFromDuplicates(duplicatedListings[i]);

        let versions = duplicatedListings[i]
            .map((listing) => listing.versions)
            .reduce((accumulator, current) => accumulator.concat(current), []);

        versions = removeDuplicatedVersionsWithSamePublishDate(versions);

        versions = removeDuplicatedVersionsWithSameDetails(versions);

        unifiedListing.versions = versions;

        let { insertedId } = await listingsCollection.insertOne(unifiedListing);
        unifiedListing._id = insertedId;

        unifiedListings.push(unifiedListing);
    }

    return unifiedListings;
}

function removeDuplicatedVersionsWithSamePublishDate(versions) {
    const uniquePublishDates = new Set(versions.map((v) => v.publishDate.toString()));

    return versions
        .filter((version) => {
            if (uniquePublishDates.has(version.publishDate.toString())) {
                uniquePublishDates.delete(version.publishDate.toString());
                return true;
            }

            return false;
        })
        .sort((object1, object2) => object1.publishDate - object2.publishDate); // from smallest to largest date
}

function removeDuplicatedVersionsWithSameDetails(versions) {
    const uniqueVersions = [];
    uniqueVersions.push(versions[0]);

    for (let i = 1; i < versions.length; i++) {
        if (
            versions[i].hasSeparateTVA !== versions[i - 1].hasSeparateTVA ||
            versions[i].basePrice !== versions[i - 1].basePrice ||
            versions[i].price !== versions[i - 1].price ||
            versions[i].surface !== versions[i - 1].surface
        ) {
            uniqueVersions.push(versions[i]);
        }
    }

    for (let i = 0; i < uniqueVersions.length - 1; i++) {
        uniqueVersions[i].closeDate = uniqueVersions[i + 1].publishDate;
        uniqueVersions[i].sold = false;
    }

    return uniqueVersions;
}

function computeBaseListingFieldsFromDuplicates(duplicatedListings) {
    const sortedListings = duplicatedListings.sort(
        (list1, list2) => list2._id.getTimestamp() - list1._id.getTimestamp() // from most recent to oldest
    );

    const latestListing = sortedListings[0];

    const mergedImages = sortedListings
        .map((l) => l.images)
        .reduce((accumulator, current) => accumulator.concat(current), [])
        .map((image) => image.toString());

    const uniqueImages = [...new Set(mergedImages)].map((text) => Buffer.from(text));

    return {
        source: latestListing.source,
        id: latestListing.id,
        url: latestListing.url,
        hasNewApartment: latestListing.hasNewApartment,
        roomsCount: latestListing.roomsCount,
        zone: latestListing.zone,
        constructionYear: latestListing.constructionYear,
        floor: latestListing.floor,
        hasCentralHeating: latestListing.hasCentralHeating,
        images: uniqueImages,
        apartment: latestListing.apartment,
        versions: null,
    };
}

async function deleteDuplicatedListings(listingsCollection, duplicatedListings) {
    consoleLog('Deleting old listing records for duplicates...');

    const idsToDelete = [];

    for (let i = 0; i < duplicatedListings.length; i++) {
        const ids = duplicatedListings[i].map((l) => l._id);
        idsToDelete.push(...ids);
    }

    await listingsCollection.deleteMany({ _id: { $in: idsToDelete } });

    return idsToDelete;
}

async function updateApartmentLinks(apartmentsCollection, deletedListingsIds, unifiedListings) {
    consoleLog('Deleting old apartment links...');

    // Delete old links
    await apartmentsCollection.updateMany({}, { $pullAll: { listings: deletedListingsIds } });

    // Create new links
    consoleLog('Creating new apartment links...');

    for (let i = 0; i < unifiedListings.length; i++) {
        await apartmentsCollection.updateOne(
            { _id: unifiedListings[i].apartment },
            { $push: { listings: unifiedListings[i]._id } }
        );
    }
}

async function updateApartmentLinks2(listingsCollection, apartmentsCollection) {
    consoleLog('Updating impacted apartment links...');

    consoleLog('Fetching all apartments...');
    const apartments = await apartmentsCollection.find({}, { projection: { _id: 1, listings: 1 } });

    consoleLog('Fetching all listings...');
    const listings = await listingsCollection.find({}, { projection: { _id: 1 } });
    const listingsIdsSet = new Set(listings.map((doc) => doc._id.toString()));

    consoleLog('Fetching all unified listings...');
    const unifiedListings = await listingsCollection.find(
        {
            _id: {
                $gt: ObjectId.createFromTime(new Date('2023-04-19 21:45:00').getTime() / 1000),
            },
        },
        {
            projection: { _id: 1, apartment: 1 },
        }
    );

    consoleLog('Building the hash map...');
    const indexedUnifiedListings = {};

    for (let i = 0; i < unifiedListings.length; i++) {
        const apartmentId = unifiedListings[i].apartment.toString();

        if (!indexedUnifiedListings[apartmentId]) {
            indexedUnifiedListings[apartmentId] = [];
        }

        indexedUnifiedListings[apartmentId].push(unifiedListings[i]._id.toString());
    }

    consoleLog('Updating apartment links...');
    for (let i = 0; i < apartments.length; i++) {
        const idsToPull = [];
        const idsToPush = indexedUnifiedListings[apartments[i]._id.toString()] ?? [];
        const ids = apartments[i].listings.map((id) => id.toString());

        for (let j = 0; j < apartments[i].listings.length; j++) {
            const listingId = apartments[i].listings[j].toString();
            if (!listingsIdsSet.has(listingId)) {
                idsToPull.push(listingId);
            }
        }

        const newIds = ids.filter((id) => !idsToPull.includes(id));
        newIds.push(...idsToPush);

        if (idsToPull.length > 0 || idsToPush.length > 0) {
            await apartmentsCollection.updateOne(
                { _id: apartments[i]._id },
                { $set: { listings: newIds.map(ObjectId) } }
            );
        }
    }
}

async function fixUnifiedListingsImages(listingsCollection) {
    await listingsCollection.updateMany(
        {
            _id: {
                $gt: ObjectId.createFromTime(new Date('2023-04-19 21:45:00').getTime() / 1000),
                $lt: ObjectId.createFromTime(new Date('2023-04-20 00:15:00').getTime() / 1000),
            },
        },
        {
            $set: {
                images: [],
            },
        }
    );
}

export function indexListingsByIdAndUrl(listings) {
    const map = {};

    for (let i = 0; i < listings.length; i++) {
        const key = listings[i].id + '@' + listings[i].url;

        if (!map[key]) {
            map[key] = [];
        }

        map[key].push(listings[i]);
    }

    // E.g. {
    //   id1@url1: [ { listing1 }, { listing2 } ],
    //   id2@url2: [ { listing3 } ],
    //   id3@url3: [ { listing4 }, { listing5 }, { listing6 ],
    // }
    return map;
}

main();
