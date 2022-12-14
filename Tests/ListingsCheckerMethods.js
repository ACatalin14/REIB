import { REFERER_IMOBILIARE_RO, REFERRERS_IMOBILIARE_RO, SIMILARITY_THRESHOLD_TYPE_RELATIVE } from '../Constants.js';
import { DataExtractorImobiliareRo } from '../DataExtractors/DataExtractorImobiliareRo.js';
import { SmartRequester } from '../Helpers/SmartRequester.js';
import { ImageHasher } from '../Helpers/ImageHasher.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { DbCollection } from '../DbLayer/DbCollection.js';
import delay from 'delay';
import { config } from 'dotenv';
import { SimilarityDetector } from '../Helpers/SimilarityDetector.js';
import { consoleLog, getRandomRestingDelay } from '../Helpers/Utils.js';

config(); // Use Environment Variables

const TEST_URL_1 = {
    // ORIGINAL_URL: 'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/tineretului/garsoniera-de-vanzare-XV0O00279',
    ORIGINAL_URL: 'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/tineretului/garsoniera-de-vanzare-X9I6100HA',
    SAMPLE_URLS: [
        // 'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/tineretului/garsoniera-de-vanzare-XDPJ00012', // expired
        'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/tineretului/garsoniera-de-vanzare-X9I6100HA',
        'https://www.imobiliare.ro/vanzare-apartamente/bucuresti/tineretului/garsoniera-de-vanzare-XCI2000BH',
    ],
};

const ORIGINAL_URL = TEST_URL_1.ORIGINAL_URL;
const SAMPLE_URLS = TEST_URL_1.SAMPLE_URLS;

const checkListingsFromUrls = async function () {
    const dataExtractor = new DataExtractorImobiliareRo();
    const imageHasher = new ImageHasher();
    const similarityDetector = new SimilarityDetector(imageHasher);
    const smartRequester = new SmartRequester(REFERRERS_IMOBILIARE_RO, REFERER_IMOBILIARE_RO, {
        authority: 'www.imobiliare.ro',
    });

    const [browser, browserPage] = await smartRequester.getNewBrowserAndNewPage();

    let originalListing = await fetchListingFromUrl(
        ORIGINAL_URL,
        browserPage,
        smartRequester,
        dataExtractor,
        imageHasher
    );

    await delay(getRandomRestingDelay());

    let sampleListings = [];
    for (let sampleUrl of SAMPLE_URLS) {
        const listing = await fetchListingFromUrl(sampleUrl, browserPage, smartRequester, dataExtractor, imageHasher);
        sampleListings.push(listing);
        await delay(getRandomRestingDelay());
    }

    sampleListings.forEach((sampleListing, index) => {
        console.log(`Original VS Sample ${index}:`);
        const areSimilar = similarityDetector.checkSimilarityForHashesLists(
            originalListing.images,
            sampleListing.images
        );
        console.log(`Result: ${areSimilar ? 'SIMILAR' : 'NOT SIMILAR'}\n`);
    });

    await browser.close();
};

async function checkListingsFromDb() {
    const dbClient = new DbClient();
    await dbClient.connect();

    const dbImobiliare = new DbCollection('imobiliareRoListings', dbClient);
    const imageHasher = new ImageHasher();
    const similarityDetector = new SimilarityDetector(imageHasher);

    const projection = { projection: { _id: 0, id: 1, images: 1, roomsCount: 1 } };
    // const allListings1 = await dbImobiliare.find({ images: { $size: 1 } }, projection);
    // const allListings2 = await dbImobiliare.find({ images: { $size: 2 } }, projection);
    // const allListings3 = await dbImobiliare.find({ images: { $size: 3 } }, projection);
    // const allListings4 = await dbImobiliare.find({ images: { $size: 4 } }, projection);
    // const allListings5 = await dbImobiliare.find({ images: { $size: 5 } }, projection);
    // const allListings = [...allListings1, ...allListings2, ...allListings3, ...allListings4, ...allListings5];
    consoleLog('Fetching listings from db...');
    const allListings = await dbImobiliare.find({ images: { $exists: true }, url: { $exists: true } });

    consoleLog('Listings to check:', allListings.length);
    consoleLog('SIMILAR LISTING PAIRS:');

    let pairsCount = 0;

    for (let i = 0; i < allListings.length; i++) {
        for (let j = i + 1; j < allListings.length; j++) {
            const areSimilar =
                allListings[i].roomsCount === allListings[j].roomsCount &&
                similarityDetector.checkSimilarityForHashesLists(
                    allListings[i].images,
                    allListings[j].images,
                    SIMILARITY_THRESHOLD_TYPE_RELATIVE
                );
            if (areSimilar) {
                consoleLog('Pair', ++pairsCount, `[${i}, ${j}]: (${allListings[i].id}, ${allListings[j].id})`);
            }
        }
    }

    consoleLog('Done checking listings from db.');

    await dbClient.disconnect();
}

async function fetchListingFromUrl(url, browserPage, smartRequester, dataExtractor, imageHasher) {
    const htmlResponse = await smartRequester.getPageFromUrl(browserPage, url);
    dataExtractor.setDataSource(htmlResponse);
    const imageUrls = await dataExtractor.extractImageUrls(browserPage);
    const images = await smartRequester.fetchImagesFromUrls(imageUrls);
    const imageHashes = imageHasher.hashImages(images);
    return { images: imageHashes };
}

export { checkListingsFromUrls, checkListingsFromDb };
