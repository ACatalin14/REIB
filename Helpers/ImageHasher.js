import { Binary } from 'mongodb';
import { DEFAULT_HASH_SIZE, SIMILARITY_HASH_THRESHOLD } from '../Constants.js';

export class ImageHasher {
    constructor(smartRequester) {
        this.smartRequester = smartRequester;
    }

    dHash(image, hashSize = DEFAULT_HASH_SIZE) {
        const rowsCount = hashSize;
        const columnsCount = hashSize + 1;

        const reducedImage = image.greyscale().resize(columnsCount, rowsCount);

        const hash = Buffer.allocUnsafe((hashSize * hashSize) / 8);

        let currentByte = 0;
        let currentBitsCount = 0;
        let bytesCount = 0;

        for (let i = 0; i < rowsCount; i++) {
            for (let j = 0; j < columnsCount - 1; j++) {
                const currentPixel = reducedImage.bitmap.data[4 * (hashSize + 1) * i + 4 * j];
                const nextPixel = reducedImage.bitmap.data[4 * (hashSize + 1) * i + 4 * (j + 1)];
                const difference = nextPixel - currentPixel;
                const newBit = difference > 0 ? 1 : 0;

                currentByte = (currentByte << 1) + newBit;
                currentBitsCount++;

                if (currentBitsCount === 8) {
                    hash.writeUInt8(currentByte, bytesCount);
                    currentByte = 0;
                    currentBitsCount = 0;
                    bytesCount++;
                }
            }
        }

        return Binary(hash);
    }

    getHashesSimilarity(hash1, hash2) {
        if (hash1.buffer.length !== hash2.buffer.length) {
            throw new Error('Hashes to compare have different sizes!');
        }

        const size = hash1.buffer.length;
        let hammingDistance = 0;

        for (let i = 0; i < size; i++) {
            const byte1 = hash1.buffer[i];
            const byte2 = hash2.buffer[i];
            let diffByte = byte1 ^ byte2;

            while (diffByte) {
                const lastBit = diffByte % 2;
                hammingDistance += lastBit;
                diffByte >>= 1;
            }
        }

        return (size * 8 - hammingDistance) / (size * 8);
    }

    async fetchBinHashesFromUrls(urls) {
        let promises = [];

        for (let i = 0; i < urls.length; i++) {
            promises.push(this.smartRequester.getImagePromise(urls[i]));
        }

        const results = await Promise.allSettled(promises);
        const images = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);

        if (images.length < results.length / 2) {
            throw new Error(`Cannot fetch half of images in listing (${images.length}/${results.length} fetched).`);
        }

        return images.map((image) => this.dHash(image));
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
        // Check that a list contains (in similarity) at least SIMILARITY_IMAGES_COUNT_THRESHOLD (3) images
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
}
