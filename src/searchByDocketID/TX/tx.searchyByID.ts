import * as url from 'url';
import * as Apify from 'Apify';
import * as querystring from 'querystring';
import { handleDocs, handleFilings } from './router.searchByID';
import { CheerioHandlePage } from 'Apify';
import dotenv from 'dotenv';
import { readRecordsFromCSVFile } from '../../helper';
dotenv.config({ path: '.env' });

const { utils: { log }} = Apify;

export const TXScraper = async (): Promise<void> => {

    const list:Array<string> = readRecordsFromCSVFile('relevant-dockets.csv', 'TX');

    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://interchange.puc.texas.gov';

    console.log(list.length);
    // for(let i = 0; i < 2; i++) {
    for(const docketID of list) {
        const qs = {
            // UtilityType: 'E',
            UtilityType: '',
            ControlNumber: docketID,
            // ControlNumber: list[i],
            ItemMatch: 1,
            ItemNumber: '',
            UtilityName: '',
            FilingParty: '',
            DocumentType: 'ALL',
            Description: '',
            FilingDescription: '',
            DateFiledFrom: '',
            DateFiledTo: ''
        };

        const queryStr: string = querystring.stringify(qs);

        await requestQueue.addRequest({
            url: `${baseUrl}/Search/Search?${queryStr}`
        });
    }

    const handlePageFunction: CheerioHandlePage = async ({ request, $ }) => {
        const pathName = url.parse(request.url).pathname;
        switch (pathName) {
            case '/Search/Search':
            case '/Search/Filings':
                return handleFilings($, requestQueue);
            case '/Search/Documents':
                return handleDocs($);
        }

    };

    // Crawl URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        handlePageTimeoutSecs: 480,
        requestTimeoutSecs: 240

    });

    await crawler.run();
};

