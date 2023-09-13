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
            uint64_t  id;
            uint128_t uuid;     // To find after creation
            symbol    symbol;   // Symbol of quantity to participate to this
            string    type;   // Type of auction (e.g. TENDER_TEN, MEGA_TENDER)
            string status;   // Status of auction (e.g. BIDDING, WINNER_CALCULATION)
            string prize;        // Prize (anything)
            string public_key;   // Public key for bidding encrypted

            uint64_t  primary_key() const { return id; }
            uint128_t get_uuid() const { return uuid; }
            uint64_t  get_symbol() const { return symbol.code().raw(); }
        };

        typedef eosio::multi_index<"account"_n, account> accounts;
        typedef eosio::multi_index<"stat"_n, stat>       stats;
        typedef eosio::multi_index<
            "auction"_n, auction, indexed_by<"byuuid"_n, const_mem_fun<auction, uint128_t, &auction::get_uuid>>,
            indexed_by<"bysymbol"_n, const_mem_fun<auction, uint64_t, &auction::get_symbol>>>
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

        const string AUCTION_TYPE_0   = "TENDER_TEN";
        const string AUCTION_TYPE_1   = "MEGA_TENDER";
        const string AUCTION_STATUS_0 = "BIDDING";
        const string AUCTION_STATUS_1 = "WINNER_CALCULATION";

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
         * @param symbol - Symbol of bidding quantity.
         * @param type - Type of auction.
         * @param uuid - UUID to find auction created in the first time.
         * @param prize - Prize of auction (indication).
         * @param public_key - Public key used in bidding.
         */
        ACTION biddingstart(const symbol &symbol, const string &type, const uint128_t &uuid,
                            const string &prize, const string &public_key);

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
         * @param private_key - Private key used in this auction (announcement).
         */
        ACTION selectwinner(const uint64_t &id, const name &winner, const string &private_key);

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