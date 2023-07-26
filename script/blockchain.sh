#!/bin/bash

git submodule update --init --recursive
(( $? != 0 )) && echo "Error in submodule" && exit 1

cd blockchain
./build.sh
(( $? != 0 )) && echo "Blockchain build failed" && exit 1

./run-nodeos.sh -i
(( $? != 0 )) && echo "Running blockchain failed" && exit 1

./run-cleos.sh
(( $? != 0 )) && echo "Running cleos failed" && exit 1

sleep 1