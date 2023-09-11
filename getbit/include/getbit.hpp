#include <eosio/asset.hpp>
#include <eosio/binary_extension.hpp>
#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <string>
#include <vector>

using namespace std;

namespace eosio {
    CONTRACT getbit : public contract {
      private:
        TABLE account {
            asset balance;

            uint64_t primary_key() const { return balance.symbol.code().raw(); }
        };

        TABLE stat {
            name  issuer;
            asset supply;
            asset max_supply;

            uint64_t primary_key() const { return supply.symbol.code().raw(); }
            uint64_t get_issuer() const { return issuer.value; }
        };

        TABLE auction {
            uint64_t  id;
            uint128_t uuid;
            symbol    symbol;
            uint64_t  type;     // TENDER_TEN, MEGA_TENDER
            uint64_t  status;   // BIDDING, WINNER_CALCULATION
            string    prize;
            string    public_key;

            uint64_t  primary_key() const { return id; }
            uint128_t get_uuid() const { return uuid; }
            uint64_t  get_symbol() const { return symbol.code().raw(); }
            uint64_t  get_type() const { return type; }
        };

        typedef eosio::multi_index<"account"_n, account> accounts;
        typedef eosio::multi_index<"stat"_n, stat, indexed_by<"byissuer"_n, const_mem_fun<stat, uint64_t, &stat::get_issuer>>> stats;
        typedef eosio::multi_index<
            "auction"_n, auction, indexed_by<"byuuid"_n, const_mem_fun<auction, uint128_t, &auction::get_uuid>>,
            indexed_by<"bysymbol"_n, const_mem_fun<auction, uint64_t, &auction::get_symbol>>,
            indexed_by<"bytype"_n, const_mem_fun<auction, uint64_t, &auction::get_type>>>
            auctions;

        /**
         * @brief Add the balance of an account (if the balance does not exist, initiate the balance as zero).
         *
         * @param owner - Owner account of the balance.
         * @param value - The amount to add to the balance.
         */
        void add_balance(const name &owner, const asset &value);
        /**
         * @brief Subtract the balance of an account.
         *
         * @param owner - Owner account of the balance.
         * @param value - The amount to subtract to the balance.
         */
        void sub_balance(const name &owner, const asset &value);
        /**
         * @brief Get the balance asset.
         *
         * @param owner - Owner account.
         * @param symbol_code - Symbol of asset to find.
         * @return asset - Balance asset.
         */
        asset get_balance(const name &owner, const symbol_code &symbol_code);

      public:
        using contract::contract;
        enum AuctionType { TENDER_TEN, MEGA_TENDER };
        enum AuctionStatus { BIDDING, WINNER_CALCULATION };

        /**
         * @brief Create a token as scope.
         *
         * @param issuer - Token issuer.
         * @param max_supply - Maximum supply for the token.
         */
        ACTION create(const name &issuer, const asset &max_supply);
        /**
         * @brief Issue tokens by the issuer.
         *
         * @param to - Account to be taken the tokens issued.
         * @param quantity - Token quantity issued.
         * @param memo - Memo (max 256 bytes).
         */
        ACTION issue(const name &to, const asset &quantity, const string &memo);
        /**
         * @brief Transfer tokens.
         *
         * @param from - Account to transfer.
         * @param to - Account to receive.
         * @param quantity - Token quantity transferred.
         * @param memo - Memo (max 256 bytes).
         */
        ACTION transfer(const name &from, const name &to, const asset &quantity,
                        const string &memo);
        /**
         * @brief Open an account to be initiated.
         *
         * @param owner - Account to open.
         * @param symbol - Initiating symbol to be set as zero.
         */
        ACTION open(const name &owner, const symbol &symbol);

        ACTION biddingstart(const symbol &symbol, const uint64_t &type,
                            const uint128_t &uuid, const string &prize,
                            const string &public_key);
        ACTION biddingend(const uint64_t &id);
        ACTION selectwinner(const uint64_t &id, const name &winner, const string &private_key);

        using create_action = eosio::action_wrapper<"create"_n, &getbit::create>;
        using issue_action = eosio::action_wrapper<"issue"_n, &getbit::issue>;
        using transfer_action = eosio::action_wrapper<"transfer"_n, &getbit::transfer>;
        using open_action = eosio::action_wrapper<"open"_n, &getbit::open>;
        using biddingstart_action
            = eosio::action_wrapper<"biddingstart"_n, &getbit::biddingstart>;
        using biddingend_action = eosio::action_wrapper<"biddingend"_n, &getbit::biddingend>;
        using selectwinner_action
            = eosio::action_wrapper<"selectwinner"_n, &getbit::selectwinner>;
    };
}   // namespace eosio