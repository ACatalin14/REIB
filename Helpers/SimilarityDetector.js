import { SIMILARITY_HASH_THRESHOLD } from '../Constants.js';

export class SimilarityDetector {
    constructor(imageHasher) {
        this.imageHasher = imageHasher;
    }

    getHashesSimilarity(hash1, hash2) {
        const hammingDistance = this.imageHasher.getHammingDistanceBetween(hash1, hash2);
        const hashSize = hash1.buffer.length;

        return (hashSize * 8 - hammingDistance) / (hashSize * 8);
    }

    checkListingsAreSimilar(listing1, listing2) {
        // Add safe guard for number of rooms. If different count of rooms, there is no need to look at the images
        if (listing1.roomsCount !== listing2.roomsCount) {
            return false;
        }

        // Apartments have same number of rooms, should check their images now
        return this.checkSimilarityForHashesLists(listing1.images, listing2.images);
    }

    checkSimilarityForHashesLists(images1, images2) {
        if (!images1.length || !images2.length) {
            // If any given listing does not contain images, then we can consider that there is no similarity.
            // No agency would post a listing without at least one image, but landlords would
            return false;
        }

        if (images1.length === 1 || images2.length === 1) {
            // If a listing contains only one image, we will consider that is not similar to the other one,
            // no matter how many images the other listing has
            return false;
        }

        let smallerList = images1.length <= images2.length ? images1 : images2;
        let biggerList = images1.length > images2.length ? images1 : images2;

        let similarityMatrix = [];
        for (let i = 0; i < smallerList.length; i++) {
            similarityMatrix.push([]);
            for (let j = 0; j < biggerList.length; j++) {
                similarityMatrix[i].push(this.getHashesSimilarity(smallerList[i], biggerList[j]));
            }
        }

        return this.checkHashListsUsingSimilarityMatrix(similarityMatrix);
    }

    checkHashListsUsingSimilarityMatrix(similarityMatrix) {
        // Check that a list contains (in similarity) at least half / SIMILARITY_IMAGES_COUNT_THRESHOLD (3) images
        // included in the other list
        let similarHashesInBiggerList = [];

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
            }
        }

        const smallerListLength = similarityMatrix.length;

        if (smallerListLength === 2) {
            // The smaller listing contains exactly 2 images.
            // The listings are similar if those 2 images are found in the bigger listing
            return similarHashesInBiggerList.length === 2;
        }

        // Listings are similar if more than half of the smaller list images are found in the bigger one
        return similarHashesInBiggerList.length >= Math.ceil(smallerListLength / 2);

        // TODO: Remove if not using this strategy
        // if (similarityMatrix.length < SIMILARITY_IMAGES_COUNT_THRESHOLD) {
        //     // The smaller list is too small for the basic condition of having at least the standard threshold.
        //     // So check that the bigger list contains (in similarity) all the images of the smaller list
        //     if (similarHashesInBiggerList.length === similarityMatrix.length) {
        //         console.log('Similarity matrix:');
        //         console.log(similarityMatrix);
        //     }
        //     return similarHashesInBiggerList.length === similarityMatrix.length;
        // }
        //
        // if (similarHashesInBiggerList.length >= SIMILARITY_IMAGES_COUNT_THRESHOLD) {
        //     console.log('Similarity matrix:');
        //     console.log(similarityMatrix);
        // }
        //
        // // Check that the bigger list contains (in similarity) at least a threshold of similar images
        // return similarHashesInBiggerList.length >= SIMILARITY_IMAGES_COUNT_THRESHOLD;
    }

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

        // TODO: Look at createdAt as well as a last criteria!
        return listing2;
    }
}
