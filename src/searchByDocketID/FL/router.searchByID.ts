import {
    downloadFilesSync,
    exportJsonObjToCSV,
    openFolder,
    writeJSONFileToFolder
} from '../../helper';
import * as Apify from 'Apify';
import { FLFiling } from '../../models/FL_models/FLFiling';
import { RequestQueue } from 'Apify';
import { FLDocket } from '../../models/FL_models/FLDocket';

const base = 'http://www.psc.state.fl.us';
const baseUrl = `${base}/ClerkOffice`;
const { utils: { log }} = Apify;

/*
     not in use, because docketed date on this page is missing.
     on datail page, there is status, but can't combine with data scraped from research result page.
     todo: try puppeteer
 */
export const handleDocketDetail = async ($: CheerioSelector, docketID: string, requestQueue: RequestQueue): Promise<void> => {
    const docketDetail: FLDocket = { } as FLDocket;
    log.info('[handle docket detail]');

    const context = $('table', '#tdBodyRender').find('tr').eq(1).html();
    const all = $('strong', context).text();

    const description = all.split('--')[1].trim();
    const status = $('strong > span', context).text().replace(/[(|)]/g, '').trim();

    docketDetail.docketID = docketID;
    docketDetail.status = status;
    docketDetail.docketDescription = description;

    log.info(`[DOCKET DATA: ${JSON.stringify(docketDetail)}]`);

    // add the link pointing to filings page
    let linkToFilings = $('table', '#tdBodyRender').find('tr').eq(2).find('td > a').attr('href');

    if(linkToFilings) {
        linkToFilings = `${base}${linkToFilings}`;
        // log.info(`[LINK TO FILINGS: ${linkToFilings}]`);

        await requestQueue.addRequest({
            url: linkToFilings
        });
    }

};

export const handleFilings = async ($: CheerioSelector, docketID: string, requestQueue: RequestQueue): Promise<void> => {
    // Handle details
    log.info('[handle fillings]');

    $('#DataTable tbody').find('tr').each(async (index, el) => {

            // for test, after test remove this if
            // if (index < 2) {
                const links = [];
                const documentID = $(el).find('td').eq(0).text().trim();
                const order = $(el).find('td').eq(1).text().trim();
                const dateFiled = $(el).find('td').eq(2).text().trim();
                const description = $(el).find('td').eq(3).text().trim();

                $(el).find('td').eq(4).find('a').each((index, el) => {
                    let link = $(el).attr('href');
                    link = link.replace('..', `${base}`);
                    links.push(link);
                });

                const filing: FLFiling = {} as FLFiling;

                filing.docketID = docketID;
                filing.filingID = documentID;
                filing.order = order;
                filing.dateFiled = dateFiled;
                filing.filingDescription = description;
                filing.downloadLinks = links;

                log.info(`[FILING DATA WITH DOWNLOAD LINKS: ${JSON.stringify(filing)}`);

                exportJsonObjToCSV(filing, 'FL-filings.csv');
                // const dataSet = await Apify.openDataset('FL-FILINGS');
                // await dataSet.pushData(filing);

                // download module
                const pt = openFolder(`${docketID}/${documentID}`);
                writeJSONFileToFolder(filing, pt, `${documentID}.json`);
                // await downloadFiles(links, pt);
                downloadFilesSync(links, pt);
            }
        // }
    );

    // todo; next page?
    $('.gridFooter').find('a').each(async (index, el) => {
        const text = $(el).text();
        if(text === '>') {
            const path = $(el).attr('href');
            const nextPageLink = new URL(path, `${baseUrl}`);
            await requestQueue.addRequest({
                url: nextPageLink.href
            });
        }
    });
};

// helpers for FL
const isElectric = (docketNum: string, suffix: Array<string>): boolean => {
    return suffix.some((item) => {
        return docketNum.indexOf(item) > -1;
    });
};
