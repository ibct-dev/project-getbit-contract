project(getbit)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

add_contract( getbit getbit getbit.cpp )
target_include_directories( getbit PUBLIC ${CMAKE_SOURCE_DIR}/../include )
target_ricardian_directory( getbit ${CMAKE_SOURCE_DIR}/../ricardian )