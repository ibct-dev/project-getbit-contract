import { Api, JsonRpc, Serialize } from "eosjs";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { fetch } from "cross-fetch";
import {
    IAction,
    IAuthority,
    IBlockchainConfig,
    IGetTableRowsParams,
} from "./interface";
import { INIT_KEY, LED_PRIVATE_KEY, OTHER_PRIVATE_KEY } from "./constant";
import { TransactResult } from "eosjs/dist/eosjs-api-interfaces";
import {
    PushTransactionArgs,
    ReadOnlyTransactResult,
} from "eosjs/dist/eosjs-rpc-interfaces";
import { Account } from "./account";
import path from "path";
import fs from "fs";

export class Blockchain {
    private readonly rpc: JsonRpc;
    private accounts: Account[];
    private privateKeys: string[];
    private api: Api;
    private signatureProvider: JsSignatureProvider;

    constructor(config: IBlockchainConfig) {
        const { host, port } = config;
        const endpoint = `http://${host}:${port}`;

        this.rpc = new JsonRpc(endpoint, { fetch });
        this.accounts = [];
        this.privateKeys = [LED_PRIVATE_KEY, OTHER_PRIVATE_KEY];
        this.signatureProvider = new JsSignatureProvider(this.privateKeys);
        this.api = new Api({
            rpc: this.rpc,
            signatureProvider: this.signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
        });
    }

    private async addAccount(accountName: string): Promise<Account> {
        const { abi } = await this.rpc.get_abi(accountName);
        const account = new Account(this, accountName, abi);
        this.accounts.push(account);
        return account;
    }

    private getContractFromFile(contractName: string): {
        wasm: string;
        abi: string;
    } {
        const filePath = path.join(contractName, "build", contractName);
        return {
            abi: path.resolve(path.join(filePath, `${contractName}.abi`)),
            wasm: path.resolve(path.join(filePath, `${contractName}.wasm`)),
        };
    }

    private async checkAccountExists(accountName: string): Promise<boolean> {
        try {
            await this.rpc.get_account(accountName);
            return true;
        } catch {
            return false;
        }
    }

    async ping(): Promise<boolean> {
        try {
            await this.rpc.get_info();
            return true;
        } catch {
            return false;
        }
    }

    addPrivateKey(privateKey: string) {
        this.privateKeys.push(privateKey);
        try {
            this.signatureProvider = new JsSignatureProvider(this.privateKeys);
            this.api = new Api({
                rpc: this.rpc,
                signatureProvider: this.signatureProvider,
                textDecoder: new TextDecoder(),
                textEncoder: new TextEncoder(),
            });
        } catch (error) {
            this.privateKeys.pop();
            throw new Error(`Failed to add private key: ${error}`);
        }
    }

    async sendTransaction<T>(
        actions: IAction<T>[]
    ): Promise<TransactResult | ReadOnlyTransactResult | PushTransactionArgs> {
        return await this.api.transact(
            { actions },
            {
                blocksBehind: 5,
                expireSeconds: 30,
            }
        );
    }

    async getTable<T>(params: IGetTableRowsParams): Promise<T[]> {
        return (await this.rpc.get_table_rows(params)).rows;
    }

    async createAccount(
        accountName: string,
        creator = "led"
    ): Promise<Account> {
        try {
            await this.sendTransaction<{
                creator: string;
                name: string;
                owner: IAuthority;
                active: IAuthority;
            }>([
                {
                    account: "led",
                    name: "newaccount",
                    authorization: [
                        {
                            actor: creator,
                            permission: "active",
                        },
                    ],
                    data: {
                        creator,
                        name: accountName,
                        owner: INIT_KEY,
                        active: INIT_KEY,
                    },
                },
            ]);
        } catch (error) {
            throw new Error(`Failed to create an account: ${error}`);
        }
        return await this.addAccount(accountName);
    }

    async getAccount(accountName: string): Promise<Account> {
        const account = this.accounts.filter(
            (account) => account.accountName === accountName
        )[0];
        if (account) {
            return account;
        }

        if (!(await this.checkAccountExists(accountName))) {
            throw new Error("Account not found in blockchain");
        }
        return await this.addAccount(accountName);
    }

    async setContract(
        accountName: string,
        contractName: string
    ): Promise<Account> {
        const { wasm, abi } = this.getContractFromFile(contractName);

        const wasmInHex = fs.readFileSync(wasm).toString("hex");
        let abiJson = JSON.parse(fs.readFileSync(abi, "utf-8"));

        const abiDefType = this.api.abiTypes.get("abi_def");
        if (!abiDefType) {
            throw new Error("Abi definition not found");
        }
        abiJson = abiDefType.fields.reduce(
            (prev, curr) =>
                Object.assign(prev, {
                    [curr.name]: prev[curr.name] || [],
                }),
            abiJson
        );

        const serialBuffer = new Serialize.SerialBuffer({
            textEncoder: this.api.textEncoder,
            textDecoder: this.api.textDecoder,
        });
        abiDefType.serialize(serialBuffer, abiJson);

        const abiInHex = Buffer.from(serialBuffer.asUint8Array()).toString(
            "hex"
        );

        const ledAccount = await this.getAccount("led");
        try {
            await ledAccount.actions.setcode(
                {
                    account: accountName,
                    vmtype: 0,
                    vmversion: 0,
                    code: wasmInHex,
                },
                [
                    {
                        actor: accountName,
                        permission: "active",
                    },
                ]
            );
            await ledAccount.actions.setabi(
                {
                    account: accountName,
                    abi: abiInHex,
                },
                [
                    {
                        actor: accountName,
                        permission: "active",
                    },
                ]
            );
        } catch (error) {
            throw new Error(`Set failed: ${error}`);
        }

        const account = await this.getAccount(accountName);
        const accountAbi = await this.rpc.get_abi(accountName);
        if (accountAbi) {
            account.updateAbi(accountAbi.abi!);
        }
        return account;
    }
}
