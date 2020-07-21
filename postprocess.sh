#!/bin/bash

#brew install wget

## CLEAN
rm -rf output
rm -rf ./apify_storage/request_queues/default/
rm -rf ./apify_storage/datasets/
rm FL-filings.csv
rm FL-dockets.csv
rm download_links.txt

## RUN SCRAPER
npm run fl

## DOWNLOAD FILES
mkdir -p output/files
for line in `cat download_links.txt`
do
    wget ${line} -P output/files
done

## BUILD STRUCTURE
