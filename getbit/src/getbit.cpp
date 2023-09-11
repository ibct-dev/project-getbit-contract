#include <getbit.hpp>

namespace eosio {
    ACTION getbit::create(const name &issuer, const asset &max_supply) {
        require_auth(get_self());

        check(is_account(issuer), "Issuer account does not exist");

        asset      max_supply_asset = max_supply;
        const auto symbol           = max_supply_asset.symbol;
        check(symbol.is_valid(), "Invalid symbol");
        check(symbol.precision() == 0, "Precision must be a zero");

        check(max_supply_asset.is_valid(), "Invalid supply");
        if (!max_supply_asset.amount) {
            max_supply_asset.amount = asset::max_amount;
        }
        check(max_supply_asset.amount > 0, "Maximum supply must be positive");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat == stat_table.end(), "Symbol already exists");

        stat_table.emplace(get_self(), [&](stat &s) {
            s.issuer        = issuer;
            s.supply.symbol = symbol;
            s.max_supply    = max_supply_asset;
        });
    }

    ACTION getbit::issue(const name &to, const asset &quantity, const string &memo) {
        check(is_account(to), "To account does not exist");
        check(memo.size() <= 256, "Memo must be within 256 bytes");

        const auto symbol = quantity.symbol;
        check(symbol.is_valid(), "Invalid symbol");
        check(symbol.precision() == 0, "Precision must be a zero");
        check(quantity.amount > 0, "Quantity must be a positive integer");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before ");

        require_auth(existing_stat->issuer);
        check(symbol == existing_stat->supply.symbol, "Symbol mismatch");
        check(quantity.amount <= existing_stat->max_supply.amount
                                     - existing_stat->supply.amount,
              "Quantity exceeds available supply");

        stat_table.modify(existing_stat, get_self(),
                          [&](stat &s) { s.supply += quantity; });

        add_balance(existing_stat->issuer, quantity);
    }

    ACTION getbit::transfer(const name &from, const name &to,
                            const asset &quantity, const string &memo) {
        // require_auth(from);
        require_auth(get_self());

        check(from != to, "Cannot transfer to self");
        check(is_account(to), "To account does not exist");
        check(memo.size() <= 256, "Memo must be within 256 bytes");

        const auto symbol = quantity.symbol;
        check(symbol.is_valid(), "Invalid symbol");
        check(symbol.precision() == 0, "Precision must be a zero");
        check(quantity.is_valid(), "Invalid quantity");
        check(quantity.amount > 0, "Quantity must be a positive integer");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before ");
        check(symbol == (existing_stat->supply).symbol, "Symbol mismatch");

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
              "Symbol does not exist, create before ");

        accounts   account_table(get_self(), owner.value);
        const auto existing_account = account_table.find(symbol.code().raw());
        if (existing_account == account_table.end()) {
            account_table.emplace(get_self(), [&](auto &a) {
                a.balance = asset { 0, symbol };
            });
        }
    }

    ACTION getbit::biddingstart(const symbol &symbol, const uint64_t &type,
                                const uint128_t &uuid, const string &prize,
                                const string &public_key) {
        require_auth(get_self());

        check(type == getbit::AuctionType::TENDER_TEN || type == getbit::AuctionType::MEGA_TENDER,
              "Unknown auction type");

        stats      stat_table(get_self(), get_self().value);
        const auto existing_stat = stat_table.find(symbol.code().raw());
        check(existing_stat != stat_table.end(),
              "Symbol does not exist, create before ");

        auctions auction_table(get_self(), get_self().value);
        auction_table.emplace(get_self(), [&](auction &a) {
            a.id         = auction_table.available_primary_key();
            a.symbol     = symbol;
            a.uuid       = uuid;
            a.type       = type;
            a.status     = 0;
            a.prize      = prize;
            a.public_key = public_key;
        });
    }

    ACTION getbit::biddingend(const uint64_t &id) {
        require_auth(get_self());

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(id);
        check(existing_auction != auction_table.end(),
              "The auction does not exist");
        check(existing_auction->status == getbit::AuctionStatus::BIDDING,
              "The auction was already ended");

        auction_table.modify(existing_auction, get_self(), [&](auction &a) {
            a.status = getbit::AuctionStatus::WINNER_CALCULATION;
        });
    }

    ACTION getbit::selectwinner(const uint64_t &id, const name &winner,
                                const string &private_key) {
        require_auth(get_self());

        auctions   auction_table(get_self(), get_self().value);
        const auto existing_auction = auction_table.find(id);
        check(existing_auction != auction_table.end(),
              "The auction does not exist");
        check(existing_auction->status == getbit::AuctionStatus::WINNER_CALCULATION,
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

        const auto &owner_account
            = account_table.get(symbol_code.raw(), "Balance not found");
        return owner_account.balance;
    }
}   // namespace eosio
