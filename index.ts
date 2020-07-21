import { FLscraper } from './src/searchByDocketID/FL/fl.searchByID';

import dotenv from 'dotenv';
import {TXScraper} from "./src/searchByDocketID/TX/tx.searchyByID";
import {CAScraper} from "./src/searchByDocketID/CA/ca";
dotenv.config({ path: '.env' });


(async () => {
    try{
        const state = process.env.STATE ? process.env.STATE: 'FL';
        console.log(state);
        switch (state) {
            case 'FL':
                await FLscraper();
                break;
            case 'TX':
                await TXScraper();
                break;
            case 'CA':
                await CAScraper();
                break;
            // case 'TX':
        }
    } catch (err) {
        console.log(err.message);
    } finally {
        process.exit(0);
    }
})();



