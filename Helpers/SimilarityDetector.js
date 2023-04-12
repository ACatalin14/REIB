import {
    SIMILARITY_HASH_THRESHOLD,
    SIMILARITY_IMAGES_COUNT_THRESHOLD,
    SIMILARITY_THRESHOLD_TYPE_FIXED,
    SIMILARITY_THRESHOLD_TYPE_RELATIVE,
} from '../Constants.js';

export class SimilarityDetector {
    constructor(imageHasher) {
        this.imageHasher = imageHasher;
    }

    getHashesSimilarity(hash1, hash2) {
        const hammingDistance = this.imageHasher.getHammingDistanceBetween(hash1, hash2);
        const hashSize = hash1.buffer.length;

        return (hashSize * 8 - hammingDistance) / (hashSize * 8);
    }

    checkListingRefersToApartment(listing, apartment) {
        // Safe guard for number of rooms. If different count of rooms, there is no need to look at the images
        if (listing.roomsCount !== apartment.roomsCount) {
            return false;
        }

        // Check for age of apartment. If apartment is old/new and listing presents new/old apt. no need to look further
        if (listing.hasNewApartment !== apartment.isNew) {
            return false;
        }

        // Same age and number of rooms, better check their images
        const thresholdType = apartment.isNew ? SIMILARITY_THRESHOLD_TYPE_RELATIVE : SIMILARITY_THRESHOLD_TYPE_FIXED;
        return this.checkSimilarityForHashesLists(listing.images, apartment.images, thresholdType);
    }

    checkSimilarityForHashesLists(images1, images2, thresholdType) {
        if (!images1.length || !images2.length) {
            // If any given list does not contain images, then we can consider that there is no similarity.
            // No agency would post a listing without at least one image, but landlords would
            return false;
        }

        if (images1.length === 1 || images2.length === 1) {
            // If a listing contains only one image, we will consider that is not similar to the other one,
            // no matter how many images the other list has
            return false;
        }

        const similarityMatrix = this.computeSimilarityMatrixFromHashesLists(images1, images2);

        return this.checkHashListsUsingSimilarityMatrix(similarityMatrix, thresholdType);
    }

    computeSimilarityMatrixFromHashesLists(list1, list2) {
        let smallerList = list1.length <= list2.length ? list1 : list2;
        let biggerList = list1.length > list2.length ? list1 : list2;

        let similarityMatrix = [];
        for (let i = 0; i < smallerList.length; i++) {
            similarityMatrix.push([]);
            for (let j = 0; j < biggerList.length; j++) {
                similarityMatrix[i].push(this.getHashesSimilarity(smallerList[i], biggerList[j]));
            }
        }

        return similarityMatrix;
    }

    checkHashListsUsingSimilarityMatrix(similarityMatrix, thresholdType) {
        // Check that a list contains (in similarity) images included in the other list
        let similarHashesPairs = this.getSimilarHashesIndexesFromMatrix(similarityMatrix);

        const smallerListLength = similarityMatrix.length;

        if (smallerListLength === 2) {
            // The smaller listing contains exactly 2 images.
            // The listings are similar if those 2 images are found in the bigger listing
            return similarHashesPairs.length === 2;
        }

        if (thresholdType === SIMILARITY_THRESHOLD_TYPE_RELATIVE) {
            // For new apartments, lists are similar if more than half of the smaller list images
            // are found in the bigger one (relative threshold)
            return similarHashesPairs.length >= Math.ceil(smallerListLength / 2);
        }

        if (smallerListLength < SIMILARITY_IMAGES_COUNT_THRESHOLD) {
            // The smaller list is too small for the basic condition of having at least the fixed threshold.
            // So check that the bigger list contains (in similarity) all the images of the smaller list
            return similarHashesPairs.length === smallerListLength;
        }

        // Check that the bigger list contains (in similarity) at least a fixed threshold of similar images
        return similarHashesPairs.length >= SIMILARITY_IMAGES_COUNT_THRESHOLD;
    }

    getSimilarHashesIndexesFromMatrix(similarityMatrix) {
        const similarHashesInBiggerList = [];
        const similarHashesIndexes = [];

        for (let i = 0; i < similarityMatrix.length; i++) {
            let maxSimilarity = 0;
            let maxPosition = -1;

            for (let j = 0; j < similarityMatrix[i].length; j++) {
                if (similarHashesInBiggerList.includes(j)) {
                    continue;
                }

                if (similarityMatrix[i][j] > maxSimilarity) {
                    maxSimilarity = similarityMatrix[i][j];
                    maxPosition = j;
                }
            }

            if (maxSimilarity >= SIMILARITY_HASH_THRESHOLD) {
                similarHashesInBiggerList.push(maxPosition);
                similarHashesIndexes.push([i, maxPosition]);
            }
        }

        return similarHashesIndexes;
    }

    getDifferenceBetweenHashesLists(list1, list2) {
        const similarityMatrix = this.computeSimilarityMatrixFromHashesLists(list1, list2);
        const similarHashesIndexes = this.getSimilarHashesIndexesFromMatrix(similarityMatrix);
        const similarHashesIndexesInList1 =
            list1.length <= list2.length
                ? similarHashesIndexes.map((pair) => pair[0]) // Perform smallerList - biggerList difference
                : similarHashesIndexes.map((pair) => pair[1]); // Perform biggerList - smallerList difference

        const difference = [];

        for (let i = 0; i < list1.length; i++) {
            if (!similarHashesIndexesInList1.includes(i)) {
                difference.push(list1[i]);
            }
        }

        return difference;
    }

    getUnionBetweenHashesLists(list1, list2) {
        return [...list1, ...this.getDifferenceBetweenHashesLists(list2, list1)];
    }
}
