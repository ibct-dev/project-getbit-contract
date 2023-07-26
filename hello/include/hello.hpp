#include <eosio/asset.hpp>
#include <eosio/eosio.hpp>
#include <string>

using namespace eosio;
using namespace std;
using std::string;
typedef uint64_t id_type;

CONTRACT hello : public contract {
  private:
    struct [[eosio::table]] person {
        name   name;
        int    age;
        string city;

        id_type primary_key() const { return name.value; }
    };

    typedef eosio::multi_index<"people"_n, person> people;

  public:
    using contract::contract;

    [[eosio::action]] void create(const name &name, const int &age, const string &city);

    using create_action = action_wrapper<"create"_n, &hello::create>;
};