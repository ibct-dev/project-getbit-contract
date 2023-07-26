export interface IGetTableRowsParams {
    json: boolean;
    code: string;
    table: string;
    scope: string;
    lower_bound?: string;
    upper_bound?: string;
    index_position?: number;
    limit?: number;
    reverse?: boolean;
    show_payer?: boolean;
    key_type?:
        | "i64"
        | "i128"
        | "i256"
        | "float64"
        | "float128"
        | "name"
        | "sha256"
        | "ripemd160"
        | "";
}

export interface Table {
    [key: string]: (params?: ITableParams) => Promise<any>;
}

export interface ITableParams {
    scope?: string;
    lower_bound?: string;
    upper_bound?: string;
    index_position?: number;
    limit?: number;
    reverse?: boolean;
    show_payer?: boolean;
    key_type?:
        | "i64"
        | "i128"
        | "i256"
        | "float64"
        | "float128"
        | "name"
        | "sha256"
        | "ripemd160"
        | "";
}
