import { Authorization } from "eosjs/dist/eosjs-serialize";
import { IAuthorization } from "./auth.interface";

export interface IAction<T> {
    account: string;
    name: string;
    authorization: IAuthorization[];
    data: T;
}

export interface Action {
    [key: string]: (data: any, authorizations: Authorization[]) => Promise<any>;
}
