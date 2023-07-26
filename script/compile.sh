#!/bin/bash

source .env

echo $CONTRACT_NAME
cd $CONTRACT_NAME

rm -rf build && mkdir build
cd build

cmake ..
(( $? != 0 )) && echo "CMake build failed" && exit 1

make
(( $? != 0 )) && echo "Make build failed" && exit 1

cd ../..