import Jimp from 'jimp';
import fs from 'fs';
import { Binary } from 'mongodb';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { SimilarityDetector } from '../Helpers/SimilarityDetector.js';

const SAMPLES_FOLDER = './Tests/SamplesResized/';
const ORIGINAL_SAMPLE = 'original.png';

async function checkWithPerceptualHash() {
    const testSamples = fs.readdirSync(SAMPLES_FOLDER).filter((sample) => sample !== ORIGINAL_SAMPLE);

    const originalImageBits = await Jimp.read(SAMPLES_FOLDER + ORIGINAL_SAMPLE);
    const originalStringHash = originalImageBits.hash(64);
    const originalHash = Binary(Buffer.from(originalStringHash, 'base64'));
    const originalDecodedHash = [...originalHash.buffer].map((b) => b.toString(2).padStart(8, '0')).join('');

    const testSampleImages = [];
    for (let sample of testSamples) {
        const image = await Jimp.read(SAMPLES_FOLDER + sample);
        const strHash = image.hash(64);
        const hash = Binary(Buffer.from(strHash, 'base64'));
        const decodedHash = [...hash.buffer].map((b) => b.toString(2).padStart(8, '0')).join('');
        const distanceFromOriginal = Jimp.compareHashes(originalDecodedHash, decodedHash);
        testSampleImages.push({ sample, decodedHash, distanceFromOriginal });
    }

    testSampleImages.push({
        sample: ORIGINAL_SAMPLE,
        decodedHash: originalDecodedHash,
        distanceFromOriginal: Jimp.compareHashes(originalDecodedHash, originalDecodedHash),
    });

    testSampleImages.sort((a, b) => a.distanceFromOriginal - b.distanceFromOriginal);

    console.log(`\nSimilarities for images in folder "${SAMPLES_FOLDER}" using pHash\n`);
    testSampleImages.forEach((image) => {
        const distance = image.distanceFromOriginal;
        console.log(`${(1 - distance) * 100}% Similarity between original.png - ${image.sample}`);
    });
}

async function checkWithDiffHash() {
    const testSamples = fs.readdirSync(SAMPLES_FOLDER).filter((sample) => sample !== ORIGINAL_SAMPLE);
    const imageHasher = new ImageHasher();
    const similarityDetector = new SimilarityDetector(imageHasher);

    const originalImage = await Jimp.read(SAMPLES_FOLDER + ORIGINAL_SAMPLE);
    const originalHash = imageHasher.dHash(originalImage);

    const testSampleImages = [];
    for (let sample of testSamples) {
        const image = await Jimp.read(SAMPLES_FOLDER + sample);
        const hash = imageHasher.dHash(image);
        const similarityWithOriginal = similarityDetector.getHashesSimilarity(originalHash, hash);
        testSampleImages.push({ sample, hash, similarityWithOriginal });
    }

    testSampleImages.push({
        sample: ORIGINAL_SAMPLE,
        hash: originalHash,
        similarityWithOriginal: similarityDetector.getHashesSimilarity(originalHash, originalHash),
    });

    testSampleImages.sort((a, b) => b.similarityWithOriginal - a.similarityWithOriginal);

    console.log(`\nSimilarities for images in folder "${SAMPLES_FOLDER}" using dHash\n`);

    testSampleImages.forEach((image) => {
        const similarityWithOriginal = image.similarityWithOriginal;
        console.log(`${similarityWithOriginal * 100}% Similarity between original.png - ${image.sample}`);
    });
}

checkWithPerceptualHash();

checkWithDiffHash();
