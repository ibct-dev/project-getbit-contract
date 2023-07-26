import { Blockchain } from "../library/blockchain";

describe("getbit", () => {
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
        const contractName = "getbit";
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
