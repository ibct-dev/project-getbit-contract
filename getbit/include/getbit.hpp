#include <eosio/asset.hpp>
#include <eosio/binary_extension.hpp>
#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <string>

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

        // TABLE auction {
        //     uint64_t id;
        //     symbol   symbol;
        //     name     manager;
        //     string   uuid;
        //     string   prize;
        //     string   public_key;
        //     uint8_t  current_bidder;
        //     uint8_t  max_bidder;
        // };

        typedef eosio::multi_index<"account"_n, account> accounts;
        typedef eosio::multi_index<"stat"_n, stat, indexed_by<"byissuer"_n, const_mem_fun<stat, uint64_t, &stat::get_issuer>>> stats;

        /**
         * @brief Add balance of an account (if the balance does not exist, initiate the balance as zero).
         *
         * @param owner - Owner account of the balance.
         * @param value - The amount to add to the balance.
         */
        void add_balance(const name &owner, const asset &value);
        /**
         * @brief Subtract balance of an account.
         *
         * @param owner - Owner account of the balance.
         * @param value - The amount to subtract to the balance.
         */
        void sub_balance(const name &owner, const asset &value);

      public:
        using contract::contract;

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

        using create_action = eosio::action_wrapper<"create"_n, &getbit::create>;
        using issue_action = eosio::action_wrapper<"issue"_n, &getbit::issue>;
        using transfer_action = eosio::action_wrapper<"transfer"_n, &getbit::transfer>;
        using open_action = eosio::action_wrapper<"open"_n, &getbit::open>;
    };
}   // namespace eosio