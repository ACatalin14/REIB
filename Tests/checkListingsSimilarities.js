import { checkListingsFromDb, checkListingsFromUrls } from './ListingsCheckerMethods.js';

await checkListingsFromUrls();
await checkListingsFromDb();
