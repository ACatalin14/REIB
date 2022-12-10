export const RESTING_DELAY_MIN = 1000; // 1 seconds
export const RESTING_DELAY_MAX = 4000; // 4 seconds
export const RETRY_IMAGES_FETCH_DELAY = 65000; // 65 seconds
export const RETRY_DB_OPERATION_DELAY = 30000; // 30 seconds
export const RETRY_XML_FETCH_DELAY = 5000; // 5 seconds
export const RETRY_CREATE_BROWSER_DELAY = 1000; // 1 second

export const SYNCHRONIZATION_TIME = '14:00';

// Number of similar images between two listings so they can be considered similar listings
export const SIMILARITY_IMAGES_COUNT_THRESHOLD = 3;
// Percentage threshold between two image hashes so they can be considered similar images
export const SIMILARITY_HASH_THRESHOLD = 0.9;

export const DEFAULT_HASH_SIZE = 16; // Use powers of 2

export const SOURCE_IMOBILIARE_RO = 'imobiliare.ro';
export const SOURCE_OLX_RO = 'olx.ro';

// TODO: Adapt collections to the new strategy
export const DB_REIB = 'reib';
export const DB_REIB_TEST = 'reib-test';
export const DB_COLLECTION_CLOSED_LISTINGS = 'closedListings';
export const DB_COLLECTION_DISTINCT_LISTINGS = 'distinctListings';
export const DB_COLLECTION_IMOBILIARE = 'imobiliareRoListings';
export const DB_COLLECTION_OLX = 'olxRoListings';
export const DB_COLLECTION_STORIA = 'storiaRoListings';
export const DB_COLLECTION_ANUNTUL = 'anuntulRoListings';
export const DB_COLLECTION_SYNC_STATS = 'syncStats';
export const DB_COLLECTION_MARKET_STATS = 'marketStats';
export const DB_COLLECTION_CLOSED_LISTINGS_STATS = 'closedListingsStats';
export const DB_COLLECTION_DISTINCT_LISTINGS_STATS = 'distinctListingsStats';

// TODO: Update this array as the implementation goes on
export const SOURCE_TO_DB_COLLECTION_MAP = {
    [SOURCE_IMOBILIARE_RO]: DB_COLLECTION_IMOBILIARE,
};

export const IMAGES_FETCH_MODE_PARALLEL = 'parallel';
export const IMAGES_FETCH_MODE_SEQUENTIAL = 'sequential';

export const URL_SSL_PROXIES = 'https://sslproxies.org/';
export const URL_XML_IMOBILIARE_LISTINGS_BUCHAREST =
    'https://www.imobiliare.ro/sitemap-listings-apartments-for-sale-bucuresti-ilfov-ro.xml';
export const URL_XML_ANUNTUL_LISTINGS_BUCHAREST_1 = 'https://www.anuntul.ro/sitemap-category_3.xml';

export const HTTP_STATUS_CODE_OK = 200;

export const PROXIES_COUNT = 100;

// Working proxies available by webshare.io
export const WORKING_PROXIES = [
    '185.199.229.156:7492:koqpsbza:vmlw1cx5p6lc',
    '185.199.228.220:7300:koqpsbza:vmlw1cx5p6lc',
    '185.199.231.45:8382:koqpsbza:vmlw1cx5p6lc',
    '188.74.210.207:6286:koqpsbza:vmlw1cx5p6lc',
    '188.74.183.10:8279:koqpsbza:vmlw1cx5p6lc',
    '188.74.210.21:6100:koqpsbza:vmlw1cx5p6lc',
    '45.155.68.129:8133:koqpsbza:vmlw1cx5p6lc',
    '154.95.36.199:6893:koqpsbza:vmlw1cx5p6lc',
    '45.94.47.66:8110:koqpsbza:vmlw1cx5p6lc',
    '144.168.217.88:8780:koqpsbza:vmlw1cx5p6lc',
];

export const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41',
    'Opera/9.80 (Macintosh; Intel Mac OS X; U; en) Presto/2.2.15 Version/10.00',
    'Opera/9.60 (Windows NT 6.0; U; en) Presto/2.1.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
];

export const REFERER_IMOBILIARE_RO = 'https://www.imobiliare.ro/';
export const REFERRERS_IMOBILIARE_RO = [
    'https://www.google.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.imoradar24.ro/',
    'https://www.argus.me/',
];

export const LISTING_PRICE_MIN_THRESHOLD = 10000; // Minimum amount of Euros a listing must have to be saved in database
export const LISTING_PRICE_MAX_SUS_THRESHOLD = 5000000; // Maximum amount of Euros a listing can have without roomsCount check
export const LISTING_ROOMS_COUNT_SUS_THRESHOLD = 8;
