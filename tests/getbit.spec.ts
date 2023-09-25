import { Account } from "../library/account";
import { Blockchain } from "../library/blockchain";
import {
    AccountRow,
    AuctionRow,
    AuctionStatus,
    AuctionStatusNumber,
    AuctionType,
    AuctionTypeNumber,
    StatRow,
} from "./libs";

describe("getbit", () => {
    let blockchain: Blockchain;
    let contract: Account;

    const contractName = "getbit";
    const contractAccount = "getbit";
    const testAccounts: string[] = ["alice", "bob", "carol"];
    const maxSupply = "4611686018427387903";
    const symbol = "COU";

    const chargeTest: number[] = [1000, 10000, 100000];

    const auctionTest: AuctionRow[] = [
        {
            id: 0,
            symbol,
            type: AuctionType.TENDER_TEN,
            status: AuctionStatus.BIDDING,
            prize: "100 USDT",
            public_key: "publickey",
            private_key: "privatekey",
            winner: testAccounts[0],
            winner_number: "1234",
            winner_txhash: "txhash",
        },
        {
            id: 1,
            symbol,
            type: AuctionType.MEGA_TENDER,
            status: AuctionStatus.BIDDING,
            prize: "100000 USDT",
            public_key: "publickey",
            private_key: "privatekey",
            winner: testAccounts[1],
            winner_number: "5678",
            winner_txhash: "txhash",
        },
    ];

    const bidTest = [
        {
            bidder: testAccounts[0],
            auction_id: auctionTest[0].id,
            amount: 100,
            entries: "entries",
            hash: "hash",
        },
        {
            bidder: testAccounts[0],
            auction_id: auctionTest[1].id,
            amount: 100,
            entries: "entries",
            hash: "hash",
        },
        {
            bidder: testAccounts[1],
            auction_id: auctionTest[0].id,
            amount: 100,
            entries: "entries",
            hash: "hash",
        },
        {
            bidder: testAccounts[1],
            auction_id: auctionTest[1].id,
            amount: 100,
            entries: "entries",
            hash: "hash",
        },
        {
            bidder: testAccounts[2],
            auction_id: auctionTest[0].id,
            amount: 100,
            entries: "entries",
            hash: "hash",
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
        it(`should initiate coupon symbol: {${symbol}}`, async () => {
            try {
                const actionResult = await contract.actions.init(
                    {
                        max_supply: `${maxSupply} ${symbol}`,
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

            const accountTableRows: AccountRow[] =
                await contract.tables.account({
                    scope: contractAccount,
                });
            expect(accountTableRows.length).toBeGreaterThanOrEqual(1);
            expect(accountTableRows[0].balance).toEqual(
                `${maxSupply} ${symbol}`
            );
        });

        testAccounts.forEach((account) => {
            it(`should open account for {${account}}`, async () => {
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

        testAccounts.forEach((account, index) => {
            it(`should charge {${chargeTest[index]} ${symbol}} coupons from {${contractAccount}} to {${account}}`, async () => {
                const beforeAccountResult: AccountRow[] =
                    await contract.tables.account({
                        scope: account,
                    });
                const beforeBalance =
                    +beforeAccountResult[0].balance.split(" ")[0];

                try {
                    const actionResult = await contract.actions.charge(
                        {
                            from: contractAccount,
                            to: account,
                            quantity: `${chargeTest[index]} ${symbol}`,
                            memo: "charge test",
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

                expect(nextBalance - beforeBalance).toEqual(chargeTest[index]);
            });
        });
    });

    describe("auction", () => {
        auctionTest.forEach((auction, index) => {
            it(`should start auction #${index}`, async () => {
                const beforeTable: AuctionRow[] = await contract.tables.auction(
                    {
                        scope: contractAccount,
                    }
                );

                try {
                    const actionResult = await contract.actions.biddingstart(
                        {
                            id: auction.id,
                            symbol: `0,${auction.symbol}`,
                            type: auction.type,
                            prize: auction.prize,
                            public_key: auction.public_key,
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
                    index_position: 1,
                    key_type: "i64",
                    lower_bound: auction.id.toString(),
                    upper_bound: auction.id.toString(),
                });
                expect(auctions.length).toEqual(1);
                expect(auctions[0].type).toEqual(
                    Object.keys(AuctionType).indexOf(auction.type)
                );
                expect(auctions[0].status).toEqual(
                    Object.keys(AuctionStatus).indexOf(AuctionStatus.BIDDING)
                );
                expect(auctions[0].prize).toEqual(auction.prize);
                expect(auctions[0].public_key).toEqual(auction.public_key);
                expect(auctions[0].winner).toEqual(contractAccount);
                expect(auctions[0].winner_number).toEqual("");
                expect(auctions[0].winner_txhash).toEqual("");
            });
        });

        bidTest.forEach((bidding, index) => {
            it(`should bid for auction #${bidding.auction_id} by bidder {${bidding.bidder}}`, async () => {
                try {
                    const actionResult = await contract.actions.bid(
                        {
                            bidder: bidding.bidder,
                            auction_id: bidding.auction_id,
                            quantity: `${bidding.amount} ${symbol}`,
                            entries: "entries",
                            hash: "hash",
                        },
                        [
                            {
                                actor: bidding.bidder,
                                permission: "active",
                            },
                        ]
                    );
                    expect(actionResult).toHaveProperty("transaction_id");
                } catch (error) {
                    throw error;
                }
            });
        });

        auctionTest.forEach((auction, index) => {
            it(`should end auction #${index}`, async () => {
                const beforeAuctions: AuctionRow[] =
                    await contract.tables.auction({
                        scope: contractAccount,
                        index_position: 1,
                        key_type: "i64",
                        lower_bound: auction.id.toString(),
                        upper_bound: auction.id.toString(),
                    });
                expect(beforeAuctions.length).toEqual(1);
                expect(beforeAuctions[0].status).toEqual(
                    Object.keys(AuctionStatus).indexOf(AuctionStatus.BIDDING)
                );

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

                const afterAuctions: AuctionRow[] =
                    await contract.tables.auction({
                        scope: contractAccount,
                        index_position: 1,
                        key_type: "i64",
                        lower_bound: auction.id.toString(),
                        upper_bound: auction.id.toString(),
                    });
                expect(afterAuctions.length).toEqual(1);
                expect(afterAuctions[0].status).toEqual(
                    Object.keys(AuctionStatus).indexOf(
                        AuctionStatus.WINNER_CALCULATION
                    )
                );
            });
        });

        bidTest.slice(0, 2).forEach((bidding, index) => {
            it(`should not bid for auction #${bidding.auction_id} ended`, async () => {
                await expect(async () => {
                    await contract.actions.bid(
                        {
                            bidder: bidding.bidder,
                            auction_id: bidding.auction_id,
                            quantity: `${bidding.amount} ${symbol}`,
                            entries: "entries",
                            hash: "hash",
                        },
                        [
                            {
                                actor: bidding.bidder,
                                permission: "active",
                            },
                        ]
                    );
                }).rejects.toThrowError(
                    "assertion failure with message: The auction was already ended"
                );
            });
        });

        auctionTest.forEach((auction, index) => {
            it(`should select winner of auction #${index}`, async () => {
                const auctions: AuctionRow[] = await contract.tables.auction({
                    scope: contractAccount,
                    index_position: 1,
                    key_type: "i64",
                    lower_bound: auction.id.toString(),
                    upper_bound: auction.id.toString(),
                });
                expect(auctions.length).toEqual(1);
                expect(auctions[0].status).toEqual(
                    Object.keys(AuctionStatus).indexOf(
                        AuctionStatus.WINNER_CALCULATION
                    )
                );

                try {
                    const actionResult = await contract.actions.selectwinner(
                        {
                            id: auctions[0].id,
                            winner: auction.winner,
                            winner_number: auction.winner_number,
                            winner_txhash: auction.winner_txhash,
                            private_key: auction.private_key,
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

                const afterAuctions: AuctionRow[] =
                    await contract.tables.auction({
                        scope: contractAccount,
                        index_position: 1,
                        key_type: "i64",
                        lower_bound: auction.id.toString(),
                        upper_bound: auction.id.toString(),
                    });
                expect(afterAuctions.length).toEqual(1);
                expect(afterAuctions[0].status).toEqual(
                    Object.keys(AuctionStatus).indexOf(
                        AuctionStatus.WINNER_SELECTED
                    )
                );
            });
        });

        it(`should end and select winner of ${auctionTest.length} auctions`, async () => {
            const existingTenderTen = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i64",
                lower_bound: Object.keys(AuctionType)
                    .indexOf(AuctionType.TENDER_TEN)
                    .toString(),
                upper_bound: Object.keys(AuctionType)
                    .indexOf(AuctionType.TENDER_TEN)
                    .toString(),
            });

            const existingMegaTender = await contract.tables.auction({
                scope: contractAccount,
                index_position: 2,
                key_type: "i64",
                lower_bound: Object.keys(AuctionType)
                    .indexOf(AuctionType.MEGA_TENDER)
                    .toString(),
                upper_bound: Object.keys(AuctionType)
                    .indexOf(AuctionType.MEGA_TENDER)
                    .toString(),
            });

            expect(
                existingTenderTen.length + existingMegaTender.length
            ).toBeGreaterThanOrEqual(auctionTest.length);

            const existingWinnerSelectedAuctions =
                await contract.tables.auction({
                    scope: contractAccount,
                    index_position: 3,
                    key_type: "i64",
                    lower_bound: Object.keys(AuctionStatus)
                        .indexOf(AuctionStatus.WINNER_SELECTED)
                        .toString(),
                    upper_bound: Object.keys(AuctionStatus)
                        .indexOf(AuctionStatus.WINNER_SELECTED)
                        .toString(),
                });

            expect(
                existingWinnerSelectedAuctions.length
            ).toBeGreaterThanOrEqual(auctionTest.length);
        });
    });
});
