export interface StatRow {
    max_supply: string;
}

export interface AccountRow {
    balance: string;
}

export interface AuctionRow {
    id: number;
    symbol: string;
    type: string;
    status: string;
    prize: string;
    public_key: string;
    winner: string;
    winner_number: string;
    winner_txhash: string;
    private_key: string;
}
