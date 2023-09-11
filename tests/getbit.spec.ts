import { randomUUID } from "crypto";
import { Account } from "../library/account";
import { Blockchain } from "../library/blockchain";

interface StatRow {
    issuer: string;
    supply: string;
    max_supply: string;
}

interface AccountRow {
    balance: string;
}

interface AuctionRow {
    id: number;
    uuid: string;
    symbol: string;
    type: number;
    status: number;
    prize: string;
    public_key: string;
}

describe("getbit", () => {
    let blockchain: Blockchain;
    let contract: Account;

    const contractName = "getbit";
    const contractAccount = "getbit";
    const testAccounts = ["alice", "bob", "carol"];
    const maxSupply = "4611686018427387903";
    const symbol = "COU";

    const transferTest = [1000, 10000, 100000];

    const auctionTest = [
        {
            symbol,
            type: 0,
            uuid: BigInt("0x" + randomUUID().replace(/-/g, "")),
            prize: "100 USDT",
            publicKey: "public",
            winner: testAccounts[0],
            privateKey: "private",
        },
    ];

    beforeEach(async () => {
        blockchain = new Blockchain({
            host: "127.0.0.1",
            port: 8888,
        });
    });

    describe("setup", () => {
        it("should connect to blockchain", async () => {
            expect(await blockchain.ping()).toEqual(true);
        });

        it(`should create test accounts: ${testAccounts}`, async () => {
            await Promise.all(
                testAccounts.map(async (account) => {
                    try {
                        const createdAccount = await blockchain.createAccount(
                            account
                        );
                        expect(createdAccount.accountName).toEqual(account);
                    } catch (error) {
                        if (error instanceof Error) {
                            if (!error.message.includes("already taken")) {
                                throw `${error}: with ${account}`;
                            }
                        } else {
                            throw error;
                        }
                    }
                })
            );
        });

        it(`should create a contract account: ${contractAccount}`, async () => {
            try {
                const account = await blockchain.createAccount(contractAccount);
                expect(account.accountName).toEqual(contractAccount);
            } catch (error) {
                if (error instanceof Error) {
                    if (!error.message.includes("already taken")) {
                        throw `${error}: with ${contractAccount}`;
                    }
                } else {
                    throw error;
                }
            }
        });

        it(`should set contract: ${contractName}`, async () => {
            try {
                contract = await blockchain.setContract(
                    contractAccount,
                    contractName
                );
                expect(contract.accountName).toEqual(contractAccount);
            } catch (error) {
                if (error instanceof Error) {
                    if (!error.message.includes("already running")) {
                        throw `${error}: with ${contractAccount}`;
                    }
                    contract = await blockchain.getAccount(contractAccount);
                } else {
                    throw error;
                }
            }
        });
    });

    describe("coupon", () => {
        it(`should create coupon symbol: ${symbol}`, async () => {
            try {
                const actionResult = await contract.actions.create(
                    {
                        issuer: contractAccount,
                        max_supply: `0 ${symbol}`,
                    },
                    [
                        {
                            actor: contractAccount,
                            permission: "active",
                        },
                    ]
                );
                expect(actionResult).toHaveProperty("transaction_id");
            } catch (error) {
                if (error instanceof Error) {
                    if (!error.message.includes("Symbol already exists")) {
                        throw `${error}: with ${contractAccount}`;
                    }
                } else {
                    throw error;
                }
            }

            const tableResult: StatRow[] = await contract.tables.stat();
            expect(tableResult.length).toBeGreaterThanOrEqual(1);

            const findRow = tableResult.find((asset) =>
                asset.max_supply.includes(symbol)
            );
            expect(findRow).toBeDefined();
            expect(findRow?.max_supply).toEqual(`${maxSupply} ${symbol}`);
            expect(findRow?.issuer).toEqual(contractAccount);
        });

        testAccounts.forEach((account) => {
            it(`should open account for ${account}`, async () => {
                try {
                    const actionResult = await contract.actions.open(
                        {
                            owner: account,
                            symbol: `0,${symbol}`,
                        },
                        [
                            {
                                actor: contractAccount,
                                permission: "active",
                            },
                        ]
                    );
                    expect(actionResult).toHaveProperty("transaction_id");
                } catch (error) {
                    if (error instanceof Error) {
                        if (!error.message.includes("Symbol already exists")) {
                            throw `${error}: with ${contractAccount}`;
                        }
                    } else {
                        throw error;
                    }
                }

                const accountResult: AccountRow[] =
                    await contract.tables.account({
                        scope: account,
                    });
                expect(accountResult[0].balance).toEqual(`0 ${symbol}`);
            });
        });

        it(`should issue ${maxSupply} ${symbol} coupons (MAX) to ${contractAccount}`, async () => {
            try {
                const actionResult = await contract.actions.issue(
                    {
                        to: contractAccount,
                        quantity: `${maxSupply} ${symbol}`,
                        memo: "issue test",
                    },
                    [
                        {
                            actor: contractAccount,
                            permission: "active",
                        },
                    ]
                );
                expect(actionResult).toHaveProperty("transaction_id");
            } catch (error) {
                if (error instanceof Error) {
                    if (
                        !error.message.includes(
                            "Quantity exceeds available supply"
                        )
                    ) {
                        throw `${error}: with ${contractAccount}`;
                    }
                } else {
                    throw error;
                }
            }

            const tableResult: StatRow[] = await contract.tables.stat();
            expect(tableResult.length).toBeGreaterThanOrEqual(1);

            const findRow = tableResult.find((asset) =>
                asset.max_supply.includes(symbol)
            );
            expect(findRow).toBeDefined();
            expect(findRow?.issuer).toEqual(contractAccount);
            expect(findRow?.max_supply).toEqual(`${maxSupply} ${symbol}`);
            expect(findRow?.supply).toEqual(findRow?.max_supply);
        });

        testAccounts.forEach((account, index) => {
            it(`should transfer ${transferTest[index]} ${symbol} coupons from ${contractAccount} to ${account}`, async () => {
                const beforeAccountResult: AccountRow[] =
                    await contract.tables.account({
                        scope: account,
                    });
                const beforeBalance =
                    +beforeAccountResult[0].balance.split(" ")[0];

                try {
                    const actionResult = await contract.actions.transfer(
                        {
                            from: contractAccount,
                            to: account,
                            quantity: `${transferTest[index]} ${symbol}`,
                            memo: "transfer test",
                        },
                        [
                            {
                                actor: contractAccount,
                                permission: "active",
                            },
                        ]
                    );
                    expect(actionResult).toHaveProperty("transaction_id");
                } catch (error) {
                    throw error;
                }

                const nextAccountResult: AccountRow[] =
                    await contract.tables.account({
                        scope: account,
                    });
                const nextBalance = +nextAccountResult[0].balance.split(" ")[0];

                expect(nextBalance - beforeBalance).toEqual(
                    transferTest[index]
                );
            });
        });
    });

    describe("auction", () => {
        it(`1st auction starts`, async () => {
            const test = auctionTest[0];
            const beforeTable: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
            });

            try {
                const actionResult = await contract.actions.biddingstart(
                    {
                        symbol: `0,${test.symbol}`,
                        type: test.type,
                        uuid: test.uuid,
                        prize: test.prize,
                        public_key: test.publicKey,
                    },
                    [
                        {
                            actor: contractAccount,
                            permission: "active",
                        },
                    ]
                );
                expect(actionResult).toHaveProperty("transaction_id");
            } catch (error) {
                throw error;
            }

            const afterTable: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
            });
            expect(beforeTable.length + 1).toEqual(afterTable.length);

            const auctions: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i128",
                lower_bound: test.uuid.toString(),
                upper_bound: test.uuid.toString(),
            });
            expect(auctions.length).toEqual(1);
            expect(auctions[0].uuid.toString()).toEqual(test.uuid.toString());
            expect(auctions[0].prize).toEqual(test.prize);
            expect(auctions[0].status).toEqual(0);
        });

        it(`1st auction ends`, async () => {
            const test = auctionTest[0];
            const beforeAuctions: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i128",
                lower_bound: test.uuid.toString(),
                upper_bound: test.uuid.toString(),
            });
            expect(beforeAuctions.length).toEqual(1);
            expect(beforeAuctions[0].uuid.toString()).toEqual(
                test.uuid.toString()
            );
            expect(beforeAuctions[0].prize).toEqual(test.prize);
            expect(beforeAuctions[0].status).toEqual(0);

            try {
                const actionResult = await contract.actions.biddingend(
                    {
                        id: beforeAuctions[0].id,
                    },
                    [
                        {
                            actor: contractAccount,
                            permission: "active",
                        },
                    ]
                );
                expect(actionResult).toHaveProperty("transaction_id");
            } catch (error) {
                throw error;
            }

            const afterAuctions: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i128",
                lower_bound: test.uuid.toString(),
                upper_bound: test.uuid.toString(),
            });
            expect(afterAuctions.length).toEqual(1);
            expect(afterAuctions[0].uuid.toString()).toEqual(
                test.uuid.toString()
            );
            expect(afterAuctions[0].prize).toEqual(test.prize);
            expect(afterAuctions[0].status).toEqual(1);
        });

        it(`1st auction winner selected`, async () => {
            const test = auctionTest[0];
            const auctions: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i128",
                lower_bound: test.uuid.toString(),
                upper_bound: test.uuid.toString(),
            });
            expect(auctions.length).toEqual(1);
            expect(auctions[0].uuid.toString()).toEqual(test.uuid.toString());
            expect(auctions[0].prize).toEqual(test.prize);
            expect(auctions[0].status).toEqual(1);

            try {
                const actionResult = await contract.actions.selectwinner(
                    {
                        id: auctions[0].id,
                        winner: test.winner,
                        private_key: test.privateKey,
                    },
                    [
                        {
                            actor: contractAccount,
                            permission: "active",
                        },
                    ]
                );
                expect(actionResult).toHaveProperty("transaction_id");
            } catch (error) {
                throw error;
            }

            const afterAuctions: AuctionRow[] = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i128",
                lower_bound: test.uuid.toString(),
                upper_bound: test.uuid.toString(),
            });
            expect(afterAuctions.length).toEqual(0);
        });
    });
});
