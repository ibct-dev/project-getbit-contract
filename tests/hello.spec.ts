import { Blockchain } from "../library/blockchain";

describe("hello", () => {
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
        const contractName = "hello";
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

    it("should transact 'create'", async () => {
        const accountName = "test";
        const account = await blockchain.getAccount(accountName);
        try {
            const actionResult = await account.actions.create(
                {
                    name: "test",
                    age: 30,
                    city: "New York",
                },
                [
                    {
                        actor: "test",
                        permission: "active",
                    },
                ]
            );
            expect(actionResult).toHaveProperty("transaction_id");
        } catch (error) {
            throw error;
        }
    });

    it("should have 1 person in people table", async () => {
        const accountName = "test";
        const account = await blockchain.getAccount(accountName);
        interface IUserRow {
            name: string;
            age: number;
            city: string;
        }
        const tableResult: IUserRow[] = await account.tables.people();
        expect(tableResult.length).toEqual(1);
        expect(tableResult[0].name).toEqual("test");
        expect(tableResult[0].age).toEqual(30);
        expect(tableResult[0].city).toEqual("New York");
    });
});
