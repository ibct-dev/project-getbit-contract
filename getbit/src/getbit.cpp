#include <getbit.hpp>

namespace eosio {
    ACTION getbit::init(const asset &max_supply) {
        require_auth(get_self());

        asset max_supply_asset = max_supply;
        check(max_supply_asset.is_valid(), "Invalid supply");
        check(max_supply_asset.amount >= 0,
              "Maximum supply must be non-negative");
        if (max_supply_asset.amount == 0) {
            max_supply_asset.amount = asset::max_amount;
        }

        const auto symbol = max_supply_asset.symbol;
        check(symbol.is_valid(), "Invalid symbol");
        check(symbol.precision() == 0, "Precision must be a zero");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat == stat_table.end(), "Symbol already exists");

        stat_table.emplace(get_self(),
                           [&](stat &s) { s.max_supply = max_supply_asset; });

        accounts   account_table(get_self(), get_self().value);
        const auto existing_account = account_table.find(symbol.code().raw());
        if (existing_account == account_table.end()) {
            account_table.emplace(get_self(), [&](auto &a) {
                a.balance = asset { 0, symbol };
            });
        }

        add_balance(get_self(), max_supply_asset);
    }

    ACTION getbit::charge(const name &from, const name &to,
                          const asset &quantity, const string &memo) {
        require_auth(get_self());

        check(from != to, "Cannot transfer to self");
        check(is_account(to), "To account does not exist");
        check(memo.size() <= 256, "Memo must be within 256 bytes");

        check(quantity.is_valid(), "Invalid quantity");
        check(quantity.amount > 0, "Quantity must be a positive integer");
        const auto symbol = quantity.symbol;
        check(symbol.is_valid(), "Invalid symbol");
        check(symbol.precision() == 0, "Precision must be a zero");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before");

        require_recipient(from);
        require_recipient(to);

        sub_balance(from, quantity);
        add_balance(to, quantity);
    }

    ACTION getbit::open(const name &owner, const symbol &symbol) {
        require_auth(get_self());

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before");

        accounts   account_table(get_self(), owner.value);
        const auto existing_account = account_table.find(symbol.code().raw());
        if (existing_account == account_table.end()) {
            account_table.emplace(get_self(), [&](auto &a) {
                a.balance = asset { 0, symbol };
            });
        }
    }

    ACTION getbit::biddingstart(const uint64_t &id, const symbol &symbol,
                                const string &type, const string &prize,
                                const string &public_key, const asset &biddings_limit) {
        require_auth(get_self());

        check(type == getbit::AUCTION_TYPE_0 || type == getbit::AUCTION_TYPE_1,
              "Unknown auction type");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before");

        const auto biddings_symbol = biddings_limit.symbol;
        check(biddings_symbol.is_valid(), "Invalid symbol for biddings");
        check(biddings_symbol.precision() == 0, "Precision must be a zero");
        check(biddings_symbol.code().raw() == symbol.code().raw(),
              "Mismatched symbols");

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(id);
        check(existing_auction == auction_table.end(),
              "The auction already exists for id");
        auction_table.emplace(get_self(), [&](auction &a) {
            a.id             = id;
            a.symbol         = symbol;
            a.type           = type == getbit::AUCTION_TYPE_0
                                   ? getbit::AUCTION_TYPE_0_TENDER_TEN
                                   : getbit::AUCTION_TYPE_1_MEGA_TENDER;
            a.status         = getbit::AUCTION_STATUS_0_BIDDING;
            a.biddings       = asset { 0, symbol };
            a.biddings_limit = biddings_limit;
            a.prize          = prize;
            a.public_key     = public_key;
            a.winner         = get_self();
            a.winner_number  = "";
            a.winner_txhash  = "";
            a.private_key    = "";
        });
    }

    ACTION getbit::bid(const name &bidder, const uint64_t &auction_id,
                       const asset &quantity, const string &entries, const string &hash) {
        require_auth(bidder);

        check(quantity.is_valid(), "Invalid quantity");
        check(quantity.amount > 0, "Quantity must be a positive integer");

        const auto symbol = quantity.symbol;
        check(symbol.is_valid(), "Invalid symbol");
        check(symbol.precision() == 0, "Precision must be a zero");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before");

        const asset balance = get_balance(bidder, symbol.code());
        check(balance.amount >= quantity.amount, "Not enough balance");

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(auction_id);
        check(existing_auction != auction_table.end(),
              "The auction does not exist");

        check(existing_auction->symbol == symbol, "The symbol not the same");
        check(existing_auction->status == getbit::AUCTION_STATUS_0_BIDDING,
              "The auction was already ended");

        if (existing_auction->biddings_limit.amount > 0) {
            check(existing_auction->biddings.amount + quantity.amount
                      <= existing_auction->biddings_limit.amount,
                  "Biddings limit exceeded");

            auction_table.modify(existing_auction, get_self(),
                                 [&](auction &a) { a.biddings += quantity; });
        }

        require_recipient(get_self());
        require_recipient(bidder);

        sub_balance(bidder, quantity);
        add_balance(get_self(), quantity);
    }

    ACTION getbit::biddingend(const uint64_t &id) {
        require_auth(get_self());

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(id);
        check(existing_auction != auction_table.end(),
              "The auction does not exist");

        check(existing_auction->status == getbit::AUCTION_STATUS_0_BIDDING,
              "The auction was already ended");

        auction_table.modify(existing_auction, get_self(), [&](auction &a) {
            a.status = getbit::AUCTION_STATUS_1_WINNER_CALCULATION;
        });
    }

    ACTION getbit::selectwinner(const uint64_t &id, const name &winner,
                                const string &winner_number, const string &winner_txhash,
                                const string &private_key) {
        require_auth(get_self());

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(id);
        check(existing_auction != auction_table.end(),
              "The auction does not exist");

        check(existing_auction->status == getbit::AUCTION_STATUS_1_WINNER_CALCULATION,
              "The auction is not in calculation");

        auction_table.modify(existing_auction, get_self(), [&](auction &a) {
            a.status        = getbit::AUCTION_STATUS_2_WINNER_SELECTED;
            a.winner        = winner;
            a.winner_number = winner_number;
            a.winner_txhash = winner_txhash;
            a.private_key   = private_key;
        });
    }

    void getbit::add_balance(const name &owner, const asset &value) {
        accounts   account_table(get_self(), owner.value);
        const auto to = account_table.find(value.symbol.code().raw());
        if (to == account_table.end()) {
            account_table.emplace(get_self(), [&](auto &a) { a.balance = value; });
        } else {
            account_table.modify(to, get_self(),
                                 [&](auto &a) { a.balance += value; });
        }
    }

    void getbit::sub_balance(const name &owner, const asset &value) {
        accounts account_table(get_self(), owner.value);

        const auto &from
            = account_table.get(value.symbol.code().raw(), "Balance not found");
        check(from.balance.amount >= value.amount, "Overdrawn balance");

        account_table.modify(from, get_self(),
                             [&](auto &a) { a.balance -= value; });
    }

    asset getbit::get_balance(const name &owner, const symbol_code &symbol_code) {
        accounts account_table(get_self(), owner.value);

        const auto &owner_account = account_table.get(
            symbol_code.raw(), "Balance account not opened");
        return owner_account.balance;
    }

    void getbit::update() {
        require_auth(get_self());
        printl("start", 5);

        auctions auction_table(get_self(), get_self().value);
        // while (auction_table.begin() != auction_table.end()) {
        //     auto itr = --auction_table.end();
        //     auction_table.modify(itr, get_self(), [&](auction &a) {
        //         a.biddings       = asset { 0, itr->symbol };
        //         a.biddings_limit = asset { 0, itr->symbol };
        //     });
        // }
        while (auction_table.begin() != auction_table.end()) {
            auto itr = --auction_table.end();
            auction_table.erase(itr);
        }
        printl("done", 4);
    }
}   // namespace eosio
