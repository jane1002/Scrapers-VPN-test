import * as url from 'url';
import * as Apify from 'Apify';
import * as querystring from 'querystring';
import { enqueueNextPageLinks } from './router.searchByID';
import { CheerioHandlePage } from 'Apify';
import dotenv from 'dotenv';
import { exportJsonObjToCSV, formatDocketNum, readRecordsFromCSVFile } from '../../helper';
import { RequestQueue } from 'Apify';
import { TXFiling } from '../../models/TX_models/TXFiling';
dotenv.config({ path: '.env' });

const { utils: { log }} = Apify;

export const TXScraper = async (): Promise<void> => {

    const list:Array<string> = readRecordsFromCSVFile('relevant-dockets.csv', 'TX');

    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://interchange.puc.texas.gov';

    console.log(list.length);
    for(let i = 0; i < 5; i++) {
    // for(const docketID of list) {
        const qs = {
            // UtilityType: 'E',
            UtilityType: '',
            // ControlNumber: docketID,
            ControlNumber: list[i],
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
        console.log('Handle page function.');
        // await Apify.utils.sleep(3000);
        const pathName = url.parse(request.url).pathname;

        const handleFilings = async ($: CheerioSelector): Promise<void> => {
            // Handle details
            console.log('handle filings in method');

            const lastIndex = $('table tr').get().length;
            let docketNum = $('.layoutHeader h1').text();

            docketNum = formatDocketNum(docketNum);
            const links = new Set<string>();

            $('table').find('tr').each((index: number, el: CheerioElement) => {

                // for test
                if(index > 0 && index < lastIndex - 1 && index < 3) {
                // if(index > 0 && index < lastIndex - 1) {

                    const filing: TXFiling = {} as TXFiling;

                    let itemNum;
                    const itemLink = $(el).find('td > strong > a').attr('href');

                    if(itemLink) {
                        links.add(itemLink);
                        itemNum = $(el).find('td > strong > a').eq(0).text().trim();
                        // const url: URL = new URL(itemLink, baseUrl);
                        // await requestQueue.addRequest({
                        //     url: url.href
                        // });
                    } else {
                        itemNum = $(el).find('td').eq(0).text().trim();
                    }

                    const fileStamp = $(el).find('td').eq(1).text().trim();
                    const party = $(el).find('td').eq(2).text().trim();
                    const description = $(el).find('td').eq(3).text().trim();

                    filing.docketID = docketNum;
                    filing.filingID = itemNum;
                    filing.fileStamp = fileStamp;
                    filing.party = party;
                    filing.filingDescription = description;
                    filing.downloadLinks = [];

                    if(!itemLink) {
                        exportJsonObjToCSV(filing, 'TX-filings.csv');
                        // const dataset = await Apify.openDataset('TX-FILINGS');
                        // await dataset.pushData(filing);
                        log.info(`[FILING DATA WITHOUT DOWNLOAD LINKS: ${JSON.stringify(filing)}`);
                        // const pt = openFolder(`${docketNum}/${itemNum}`);
                        // writeJSONFileToFolder(filing, pt, `${itemNum}.json`);
                    }
                }
            });

            log.info(`[${links.size}]`);
            for(const l of links) {
                const url: URL = new URL(l.toString(), baseUrl);
                // console.log(url.href);
                await requestQueue.addRequest({
                    url: url.href
                });
            }

            await enqueueNextPageLinks($, requestQueue);

            console.log('Finish handle filings method');
        };

        const handleDocs = ($: CheerioSelector):void => {
            // Handle doc details
            console.log('handle docs in method');

            const filing: TXFiling = {} as TXFiling;

            const caseNum = $('.layoutHeader h1').text().split('-').map((val: string) => formatDocketNum(val));
            const docketNum = caseNum[0];
            const itemNum = caseNum[1];

            const fileStamp = $('p > strong').get(0).next.data.trim();
            const filingParty = $('p > strong').get(1).next.data.trim();
            // docket description
            const caseStyle = $('p > strong').get(2).next.data.trim();
            const filingDescription = $('p > strong').get(2).next.data.trim();

            const links = [];
            $('table').find('tr').each((index: number, el: CheerioElement) => {
                const context = $(el).find('td').eq(2).text().trim();

                if(context === 'PDF' || context === 'TIF' || context === 'DOC' || context == 'DOCX') {
                    links.push($(el).find('a').attr('href'));
                }
            });

            filing.docketID = docketNum;
            filing.filingID = itemNum;
            filing.fileStamp = fileStamp;
            filing.party = filingParty;
            // filing.caseStyle = caseStyle;
            filing.filingDescription = filingDescription;
            filing.downloadLinks = links;

            log.info(`[FILING DATA WITH DOWNLOAD LINKS: ${JSON.stringify(filing)}`);

            exportJsonObjToCSV(filing, 'TX-filings.csv');
            // const dataset = await Apify.openDataset('TX-FILINGS');
            // await dataset.pushData(filing);
            //
            // const pt = openFolder(`${docketNum}/${itemNum}`);
            // writeJSONFileToFolder(filing, pt, `${itemNum}.json`);
            // downloadFilesSync(links, pt);
            console.log('finish handle doc method');

        };

        switch (pathName) {
            case '/Search/Search':
            case '/Search/Filings':
                await handleFilings($);
                // log.info(`[FINISH HANDLE FILINGS]`);
                break;
            case '/Search/Documents':
                handleDocs($);
                // log.info(`[FINISH HANDLE DOC]`);
                break;
        }

        console.log('Finish Handle Page function');
    };

    // Crawl URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        handlePageTimeoutSecs: 480,
        requestTimeoutSecs: 240,
        maxConcurrency: 5
    });

    await crawler.run();
};

