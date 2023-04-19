/**
 * This script can be run anytime on demand, in order to make some statistics of all
 * the listings, apartments and sold apartments, for a specific reference period
 *
 * Required ENV variables
 * ======================
 * MONGODB_USERNAME = "username"
 * MONGODB_PASSWORD = "password"
 * USE_TEST_DB = "false"
 * STATS_PERIOD_START_DATE = "2023-01-01 00:00:00"
 * STATS_PERIOD_END_DATE = "2023-01-31 23:59:59"
 * STATS_RESULTS_FILE_NAME = "results.csv"
 * STATS_STEP = "{ exact | month | week | day }"
 *   "exact" - make only one series of stats, from entire period from START_DATE to END_DATE
 *   "month" - make monthly stats for calendaristic months between START_DATE and END_DATE
 *   "week" - make weekly stats for calendaristic weeks between START_DATE and END_DATE
 *   "day" - make daily stats for all full days between  START_DATE and END_DATE
 */

import { config } from 'dotenv';
import { StatsMaker } from '../Statistics/StatsMaker.js';
import { STATS_STEP_DAY, STATS_STEP_EXACT, STATS_STEP_MONTH, STATS_STEP_WEEK } from '../Constants.js';
import { consoleLog } from '../Helpers/Utils.js';

config(); // Use Environment Variables

async function main() {
    const statsMaker = new StatsMaker();

    switch (process.env.STATS_STEP) {
        case STATS_STEP_EXACT:
            await statsMaker.makeStats();
            break;
        case STATS_STEP_MONTH:
            await statsMaker.makeMonthlyStats();
            break;
        case STATS_STEP_WEEK:
            await statsMaker.makeWeeklyStats();
            break;
        case STATS_STEP_DAY:
            await statsMaker.makeDailyStats();
            break;
        default:
            consoleLog('Unrecognized stats step. Please Fix the ENV variable: STATS_STEP.');
    }
}

await main();
