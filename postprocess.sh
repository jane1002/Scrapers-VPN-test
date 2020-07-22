#!/bin/bash

#brew install wget

## CLEAN
rm -rf output

## RUN SCRAPER
npm run test

## DOWNLOAD FILES
#mkdir -p output/files
#for line in `cat download_links.txt`
#do
#    wget ${line} -P output/files
#done

## BUILD STRUCTURE
