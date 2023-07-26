#!/bin/bash

rm -rf tests
rm -rf hello

read -p "Enter your contract name: " contract_name
echo "readonly CONTRACT_NAME=\"$contract_name\"" > .env

eosio-init --project=$contract_name
(( $? != 0 )) && echo "Failed to initialize a new eosio project" && exit 1

mkdir tests
cat << EOF > tests/$contract_name.spec.ts
import { Blockchain } from "../library/blockchain";

describe("$contract_name", () => {
    let blockchain: Blockchain;

    beforeEach(async () => {
        blockchain = new Blockchain({
            host: "127.0.0.1",
            port: 8888,
        });
    });

    it("should connect to blockchain", async () => {
        expect(await blockchain.ping()).toEqual(true);
    });

    it("should create a new account", async () => {
        const accountName = "test";
        const account = await blockchain.createAccount(accountName);
        expect(account.accountName).toEqual(accountName);
    });

    it("should set the contract", async () => {
        const accountName = "test";
        const contractName = "$contract_name";
        try {
            const account = await blockchain.setContract(
                accountName,
                contractName
            );
            expect(account.accountName).toEqual(accountName);
        } catch (error) {
            throw error;
        }
    });
});
EOF

yarn
yarn test