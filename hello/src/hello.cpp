#include <hello.hpp>

ACTION hello::create(const name &name, const int &age, const string &city) {
    require_auth(name);
    check(is_account(name), "Account name not found");

    people     person_table(get_self(), get_self().value);
    const auto iterator = person_table.find(name.value);
    check(iterator == person_table.end(), "User already exists");

    person_table.emplace(name, [&](auto &row) {
        row.name = name;
        row.age  = age;
        row.city = city;
    });
}