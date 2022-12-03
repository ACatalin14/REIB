/**
 * This script is destined to be run only once a month, at the end of the month,
 * in order to compute an index containing only unique listings gathered from all
 * sources
 */

import { config } from 'dotenv';
import { DistinctIndexBuilder } from '../IndexBuilders/DistinctIndexBuilder.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { SimilarityDetector } from '../Helpers/SimilarityDetector.js';

config(); // Use Environment Variables

async function main() {
    const distinctIndexBuilder = new DistinctIndexBuilder(new DbClient(), new SimilarityDetector(new ImageHasher()));
    await distinctIndexBuilder.build();
}

await main();
