#include <eosio/asset.hpp>
#include <eosio/binary_extension.hpp>
#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <string>

using namespace std;

namespace eosio {
    CONTRACT getbit : public contract {
      private:
        TABLE stat {
            name  issuer;
            asset supply;
            asset max_supply;

            uint64_t primary_key() const { return supply.symbol.code().raw(); }
            uint64_t get_issuer() const { return issuer.value; }
        };

        TABLE auction {
            uint64_t id;
            symbol   symbol;
            name     manager;
            string   uuid;
            string   prize;
            string   public_key;
            uint8_t  current_bidder;
            uint8_t  max_bidder;
        };

        typedef eosio::multi_index<"stat"_n, stat, indexed_by<"byissuer"_n, const_mem_fun<stat, uint64_t, &stat::get_issuer>>> stats;

      public:
        using contract::contract;

        ACTION create(const name &issuer, const asset &max_supply);
        ACTION charge(const name &to, const asset &quantity, const string &memo);

        using create_action = eosio::action_wrapper<"create"_n, &getbit::create>;
        using charge_action = eosio::action_wrapper<"charge"_n, &getbit::charge>;
    };
}   // namespace eosio