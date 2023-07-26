import { Authorization } from "eosjs/dist/eosjs-serialize";

interface IKey {
    key: string;
    weight: number;
}

export interface IAuthorization {
    actor: string;
    permission: string;
}

export interface IAccountAuthorization {
    permission: Authorization;
    weight: number;
}

export interface IAuthority {
    name?: string;
    threshold: number;
    keys: IKey[];
    accounts: IAccountAuthorization[];
    waits: string[];
}

export interface IPermission {
    perm_name: string;
    parent: string;
    required_auth: IAuthority;
}
