import {
    Action,
    IAction,
    IGetTableRowsParams,
    ITableParams,
    Table,
} from "./interface";
import { Blockchain } from "./blockchain";
import { Abi } from "eosjs/dist/eosjs-rpc-interfaces";
import { Authorization } from "eosjs/dist/eosjs-serialize";

export class Account {
    public accountName: string;
    public actions: Action = {};
    public tables: Table = {};
    private blockchain: Blockchain;

    constructor(blockchain: Blockchain, accountName: string, abi?: Abi) {
        this.accountName = accountName;
        this.blockchain = blockchain;
        if (abi) {
            this.updateAbi(abi);
        }
    }

    updateAbi(abi: Abi): void {
        const actions: Action = {};
        const tables: Table = {};
        abi.actions.forEach(({ name }) => {
            actions[name] = async (
                data = {},
                authorizations: Authorization[] = []
            ) => {
                const actions: IAction<any> = {
                    account: this.accountName,
                    name: name,
                    authorization: authorizations,
                    data,
                };
                return this.blockchain.sendTransaction([actions]);
            };
        });
        abi.tables.forEach(({ name }) => {
            tables[name] = async (
                params: ITableParams = {
                    lower_bound: "",
                    upper_bound: "",
                    index_position: 1,
                    key_type: "",
                    limit: 10,
                    reverse: false,
                    show_payer: false,
                }
            ) => {
                const param: IGetTableRowsParams = {
                    table: name,
                    code: this.accountName,
                    scope: this.accountName,
                    json: true,
                    ...params,
                };

                return this.blockchain.getTable(param);
            };
        });
        this.actions = actions;
        this.tables = tables;
    }
}
