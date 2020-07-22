#!/usr/bin/env bash

!/bin/bash

#brew install wget

source ./clean.sh

# pass tx, fl, ca indicate to run different site
npm run "$1"

npm run test
