import { Binary } from 'mongodb';
import { DEFAULT_HASH_SIZE } from '../Constants.js';

export class ImageHasher {
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

    hashImages(images) {
        return images.map((image) => this.dHash(image));
    }

    getHammingDistanceBetween(hash1, hash2) {
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

        return hammingDistance;
    }
}
