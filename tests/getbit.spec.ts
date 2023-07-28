import { Account } from "../library/account";
import { Blockchain } from "../library/blockchain";

interface StatRow {
    issuer: string;
    supply: string;
    max_supply: string;
}

describe("getbit", () => {
    let blockchain: Blockchain;
    let contract: Account;

    const contractName = "getbit";
    const contractAccount = "getbit";
    const testAccounts = ["alice", "bob", "carol"];
    const symbol = "COU";

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

        it(`should create a contract account: ${contractAccount}, and set contract: ${contractName}`, async () => {
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
                        max_supply: `100 ${symbol}`,
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
            expect(tableResult.length).toEqual(1);
            expect(tableResult[0].max_supply).toEqual(`100 ${symbol}`);
            expect(tableResult[0].issuer).toEqual(contractAccount);
        });
    });
});
