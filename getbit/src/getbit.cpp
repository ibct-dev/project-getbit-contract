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

    ACTION getbit::biddingstart(const symbol &symbol, const string &type,
                                const uint128_t &uuid, const string &prize,
                                const string &public_key) {
        require_auth(get_self());

        check(type == getbit::AUCTION_TYPE_0 || type == getbit::AUCTION_TYPE_1,
              "Unknown auction type");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before");

        auctions auction_table(get_self(), get_self().value);
        auction_table.emplace(get_self(), [&](auction &a) {
            a.id         = auction_table.available_primary_key();
            a.symbol     = symbol;
            a.uuid       = uuid;
            a.type       = type;
            a.status     = getbit::AUCTION_STATUS_0;
            a.prize      = prize;
            a.public_key = public_key;
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
        check(existing_auction->status == getbit::AUCTION_STATUS_0,
              "The auction was already ended");

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

        check(existing_auction->status == getbit::AUCTION_STATUS_0,
              "The auction was already ended");

        auction_table.modify(existing_auction, get_self(), [&](auction &a) {
            a.status = getbit::AUCTION_STATUS_1;
        });
    }

    ACTION getbit::selectwinner(const uint64_t &id, const name &winner,
                                const string &private_key) {
        require_auth(get_self());

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(id);
        check(existing_auction != auction_table.end(),
              "The auction does not exist");

        check(existing_auction->status == getbit::AUCTION_STATUS_1,
              "The auction is not yet ended");

        auction_table.erase(existing_auction);
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
}   // namespace eosio
