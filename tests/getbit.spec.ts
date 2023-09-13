import { randomUUID } from "crypto";
import { Account } from "../library/account";
import { Blockchain } from "../library/blockchain";

interface StatRow {
    max_supply: string;
}

interface AccountRow {
    balance: string;
}

interface AuctionRow {
    id: number;
    uuid: string;
    symbol: string;
    type: string;
    status: string;
    prize: string;
    public_key: string;
}

enum AuctionType {
    TENDER_TEN = "TENDER_TEN",
    MEGA_TENDER = "MEGA_TENDER",
}

enum AuctionStatus {
    BIDDING = "BIDDING",
    WINNER_CALCULATION = "WINNER_CALCULATION",
}

describe("getbit", () => {
    let blockchain: Blockchain;
    let contract: Account;

    const contractName = "getbit";
    const contractAccount = "getbit";
    const testAccounts = ["alice", "bob", "carol"];
    const maxSupply = "4611686018427387903";
    const symbol = "COU";

    const chargeTest = [1000, 10000, 100000];

    const auctionTest = [
        {
            symbol,
            type: AuctionType.TENDER_TEN,
            uuid: BigInt("0x" + randomUUID().replace(/-/g, "")),
            prize: "100 USDT",
            publicKey: "publickey",
            privateKey: "privatekey",
            winner: testAccounts[0],
        },
        {
            symbol,
            type: AuctionType.MEGA_TENDER,
            uuid: BigInt("0x" + randomUUID().replace(/-/g, "")),
            prize: "100000 USDT",
            publicKey: "publickey",
            privateKey: "privatekey",
            winner: testAccounts[1],
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
                            symbol: `0,${auction.symbol}`,
                            type: auction.type,
                            uuid: auction.uuid,
                            prize: auction.prize,
                            public_key: auction.publicKey,
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
                    lower_bound: auction.uuid.toString(),
                    upper_bound: auction.uuid.toString(),
                });
                expect(auctions.length).toEqual(1);
                expect(auctions[0].uuid.toString()).toEqual(
                    auction.uuid.toString()
                );
                expect(auctions[0].prize).toEqual(auction.prize);
                expect(auctions[0].status).toEqual(AuctionStatus.BIDDING);
            });
        });

        auctionTest.forEach((auction, index) => {
            it(`should end auction #${index}`, async () => {
                const beforeAuctions: AuctionRow[] =
                    await contract.tables.auction({
                        scope: contractAccount,
                        index_position: 2,
                        key_type: "i128",
                        lower_bound: auction.uuid.toString(),
                        upper_bound: auction.uuid.toString(),
                    });
                expect(beforeAuctions.length).toEqual(1);
                expect(beforeAuctions[0].uuid.toString()).toEqual(
                    auction.uuid.toString()
                );
                expect(beforeAuctions[0].prize).toEqual(auction.prize);
                expect(beforeAuctions[0].status).toEqual(AuctionStatus.BIDDING);

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
                        index_position: 2,
                        key_type: "i128",
                        lower_bound: auction.uuid.toString(),
                        upper_bound: auction.uuid.toString(),
                    });
                expect(afterAuctions.length).toEqual(1);
                expect(afterAuctions[0].uuid.toString()).toEqual(
                    auction.uuid.toString()
                );
                expect(afterAuctions[0].prize).toEqual(auction.prize);
                expect(afterAuctions[0].status).toEqual(
                    AuctionStatus.WINNER_CALCULATION
                );
            });
        });

        auctionTest.forEach((auction, index) => {
            it(`should select winner of auction #${index}`, async () => {
                const auctions: AuctionRow[] = await contract.tables.auction({
                    scope: contractAccount,
                    index_position: 2,
                    key_type: "i128",
                    lower_bound: auction.uuid.toString(),
                    upper_bound: auction.uuid.toString(),
                });
                expect(auctions.length).toEqual(1);
                expect(auctions[0].uuid.toString()).toEqual(
                    auction.uuid.toString()
                );
                expect(auctions[0].prize).toEqual(auction.prize);
                expect(auctions[0].status).toEqual(
                    AuctionStatus.WINNER_CALCULATION
                );

                try {
                    const actionResult = await contract.actions.selectwinner(
                        {
                            id: auctions[0].id,
                            winner: auction.winner,
                            private_key: auction.privateKey,
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
                        index_position: 2,
                        key_type: "i128",
                        lower_bound: auction.uuid.toString(),
                        upper_bound: auction.uuid.toString(),
                    });
                expect(afterAuctions.length).toEqual(0);
            });
        });
    });
});
