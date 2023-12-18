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
            asset max_supply;   // Maximum apply (in fact, it is setting for symbol)

            uint64_t primary_key() const {
                return max_supply.symbol.code().raw();
            }
        };

        TABLE auction {
            uint64_t id;       // Round ID input
            symbol   symbol;   // Symbol of quantity to participate to this
            uint64_t type;   // Type of auction (e.g. TENDER_TEN (0), MEGA_TENDER (1))
            uint64_t status;   // Status of auction (e.g. BIDDING (0), WINNER_CALCULATION (1), WINNER_SELECTED (2))
            asset  biddings;   // The current bidding quantity
            asset  biddings_limit;   // The maximum bidding quantity
            string prize;            // Prize (anything)
            string public_key;       // Public key for bidding encrypted
            string private_key;      // Private key for bidding decrypted
            name   winner;           // Winner account
            string winner_number;    // Winner number chosen
            string winner_txhash;    // Winner tx ID bid

            uint64_t primary_key() const { return id; }
            uint64_t get_symbol() const { return symbol.code().raw(); }
            uint64_t get_type() const { return type; }
            uint64_t get_status() const { return status; }
        };

        typedef eosio::multi_index<"account"_n, account> accounts;
        typedef eosio::multi_index<"stat"_n, stat>       stats;
        typedef eosio::multi_index<
            "auction"_n, auction, indexed_by<"bytype"_n, const_mem_fun<auction, uint64_t, &auction::get_type>>,
            indexed_by<"bystatus"_n, const_mem_fun<auction, uint64_t, &auction::get_status>>>
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

        // Clean the table
        template <typename T> void clean_table(name self, uint64_t scope = 0) {
            uint64_t s = scope ? scope : self.value;
            T        db(self, s);
            while (db.begin() != db.end()) {
                auto itr = --db.end();
                db.erase(itr);
            }
        };

      public:
        using contract::contract;

        const string   AUCTION_TYPE_0                      = "TENDER_TEN";
        const uint64_t AUCTION_TYPE_0_TENDER_TEN           = 0;
        const string   AUCTION_TYPE_1                      = "MEGA_TENDER";
        const uint64_t AUCTION_TYPE_1_MEGA_TENDER          = 1;
        const uint64_t AUCTION_STATUS_0_BIDDING            = 0;
        const uint64_t AUCTION_STATUS_1_WINNER_CALCULATION = 1;
        const uint64_t AUCTION_STATUS_2_WINNER_SELECTED    = 2;

        ACTION clear() {
            require_auth(get_self());
            printl("cleaning", 8);

            clean_table<auctions>(get_self(), get_self().value);
        }

        /**
         * @brief Initiate supply with a new symbol.
         *
         * @param max_supply - Asset type as a new domain.
         */
        ACTION init(const asset &max_supply);

        /**
         * @brief Charge(transfer) new tokens to account.
         *
         * @param to - Receiving account.
         * @param quantity - Token quantity transferred.
         * @param memo - Memo (max 256 bytes).
         */
        ACTION charge(const name &from, const name &to, const asset &quantity,
                      const string &memo);

        /**
         * @brief Open an account to be initiated.
         *
         * @param owner - Account to open.
         * @param symbol - Initiating symbol to be set as zero.
         */
        ACTION open(const name &owner, const symbol &symbol);

        /**
         * @brief Start auction.
         *
         * @param id - Unique identifier of auction (to find).
         * @param symbol - Symbol of bidding quantity.
         * @param type - Type of auction.
         * @param prize - Prize of auction (indication).
         * @param public_key - Public key used in bidding.
         * @param biddings_limit - The limitation of biddings (maximum).
         */
        ACTION biddingstart(const uint64_t &id, const symbol &symbol,
                            const string &type, const string &prize,
                            const string &public_key, const asset &biddings_limit);

        /**
         * @brief Bid for the auction.
         *
         * @param bidder - Bidder account (caller).
         * @param auction_id - Identifier of auction.
         * @param quantity - Quantity to bid.
         * @param entries - Original data entries.
         * @param hash - Hash of original data to check the integrity.
         */
        ACTION bid(const name &bidder, const uint64_t &auction_id,
                   const asset &quantity, const string &entries, const string &hash);

        /**
         * @brief End auction by ID.
         *
         * @param id - Identifier of auction.
         */
        ACTION biddingend(const uint64_t &id);

        /**
         * @brief Select winner of the auction.
         *
         * @param id - Identifier of auction.
         * @param winner - Winner account.
         * @param winner_number - Winner number chosen by winner.
         * @param winner_txhash - Transaction hash of bidding from winner.
         * @param private_key - Private key used in this auction (announcement).
         */
        ACTION selectwinner(const uint64_t &id, const name &winner, const string &winner_number,
                            const string &winner_txhash, const string &private_key);

        using init_action = eosio::action_wrapper<"init"_n, &getbit::init>;
        using charge_action = eosio::action_wrapper<"charge"_n, &getbit::charge>;
        using open_action = eosio::action_wrapper<"open"_n, &getbit::open>;
        using biddingstart_action
            = eosio::action_wrapper<"biddingstart"_n, &getbit::biddingstart>;
        using biddingend_action = eosio::action_wrapper<"biddingend"_n, &getbit::biddingend>;
        using bid_action = eosio::action_wrapper<"bid"_n, &getbit::bid>;
        using selectwinner_action
            = eosio::action_wrapper<"selectwinner"_n, &getbit::selectwinner>;
    };
}   // namespace eosio