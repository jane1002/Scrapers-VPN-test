#!/bin/bash

source ./clean.sh

# pass tx, fl, ca indicate to run different site
npm run "$1"
