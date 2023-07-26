<h1 align="center">
    Welcome to LEDGIS Smart Contract Tester 👋
</h1>
<p>
    <img alt="Version" src="https://img.shields.io/badge/version-1.0.1-green.svg?cacheSeconds=2592000" />
</p>

> Implement your smart contract in LEDGIS with test codes.
> Call me _**LEDGIS.SCT**_ 😍

## 📖 Outline

This _**LEDGIS.SCT**_ initiates a new project to develop and test your smart contract on _LEDGIS_ blockchain. You will develop a new smart contract, write test codes, deploy the contract to a local blockchain, and then test it to confirm your implementation. Smart contract is implemented in **C++**, and test codes are implemented in **TypeScript** with running blockchain. Finally, you will be able to deploy your completed contract to the _LEDGIS MainNet_.

## 🎒 Prerequisite

> We recommend _Ubuntu 18.04_ as your OS version. If you are in MacOS(arm64), see [here](#🧐-implementation-in-macos-arm64---new-apple-chipset).

### _[Docker](https://docs.docker.com/get-started/)_

You need to install _docker_ to use basic features of _contract-boilerplate_. You can install it as a engine from [here](https://docs.docker.com/engine/install/ubuntu/) for ubuntu.

After that, you must login on `ibct` account to get `ledgis-nodeos` image from docker hub.

```Bash
$ docker login
```

### _[EOSIO Development Toolkit](https://developers.eos.io/manuals/eosio.cdt/latest/installation)_

You need to install _eosio.cdt_ to build this project.

```Bash
$ cd
$ wget https://github.com/eosio/eosio.cdt/releases/download/v1.8.0/eosio.cdt_1.8.0-1-ubuntu-18.04_amd64.deb
$ sudo apt install ./eosio.cdt_1.8.0-1-ubuntu-18.04_amd64.deb
```

### _Build-Essential_

```Bash
$ sudo apt-get install build-essential
```

## 🛫 Get Started

### Clone

```Bash
$ git clone <THIS_GIT_REPOSITORY_URL>
$ cd <THIS_GIT_REPOSITORY_DIR>
$ git submodule update --init --recursive # load submodule
```

### Init

Before starting, you must ensure that 3 ports are idle. The porst are set 8888, 9999, and 9876 as default in blockchain module. See the ports named `NODEOS_*_PORT` set in location: _`./blockchain/.env/`_.

We use `yarn` package manager in this project. If you just want to run test codes to see the given examples, use this command:

```Bash
$ yarn test
```

If not, run this command to initialize your project:

```Bash
$ yarn run init
```

A name of your project is required. The name will be used as a contract name. In detail, these are processed in running:

1. Create a new EOSIO project.
2. Generate an example of test code.
3. Compile the contract example.
4. Run a blockchain in local.
5. Test the example.

Note that the blockchain started in this project is the basic blockchain, which cannot contain system contracts of LEDGIS (e.g. _led.token_).

> **❗ Caution**
>
> We intend to provide the most basic stat blockchain to enable the implementation of any contract. If you want to use a blockchain with the system contracts of LEDGIS, run the scripts in _BOOT_ directory in the blockchain submodule.

### Development

Now, you can implement a new contract and test codes for testing them:

-   Contract
    -   _`./<YOUR_CONTRACT_NAME>/include/<YOUR_CONTRACT_NAME>.hpp`_
    -   _`./<YOUR_CONTRACT_NAME>/src/<YOUR_CONTRACT_NAME>.cpp`_
-   Test
    -   _`./tests/<YOUR_CONTRACT_NAME>.spec.ts`_

After implementation, run this command:

```Bash
$ yarn build
```

You can compile your contract to check errors in the code.

Finally, run this command to test (this command contains the above build process):

```Bash
$ yarn test
```

In detail, below processes are provided:

1. Compile your contract.
2. Clean the previous blockchain in local.
3. Run a new blockchain in local.
4. Test.

> **HINT**
>
> For each test, a new blockchain will be started on _docker_. If you do not want to run a new blockchain every time, remove the following scripts in _package.json_.
>
> ```Bash
> "pretest": "script/compile.sh && script/blockchain.sh",
> ```

## 👊 How to write test codes

This section shows how to write a test code by some examples.

### Create an account

```TypeScript
describe("contract", () => {
    let blockchain: Blockchain;

    beforeEach(async () => {
        blockchain = new Blockchain({
            host: "127.0.0.1",
            port: 8888,
        });
    });

    it("should create a new account", async () => {
        const accountName = "test";
        const account = await blockchain.createAccount(accountName);
        expect(account.accountName).toEqual(accountName);
    });
});
```

> Create a new account, and check it was succeed. You can also check the creation by _cleos_ with this command:
>
> ```Bash
> $ yarn cleos get account test
> ```

### Set your contract

```TypeScript
describe("contract", () => {
    ... // Code from previous example

    it("should set the contract", async () => {
        const accountName = "test";
        const contractName = "hello";
        try {
            const account = await blockchain.setContract(
                accountName,
                contractName
            );
            expect(account.accountName).toEqual(accountName);
        } catch (error) {
            throw error;
        }
    });
});
```

> Note that you should create an account before setting a contract. Function `setContract()` does not create a new account to blockchain.

### Execute actions

```TypeScript
describe("hello", () => {
    ... // Code from previous example

    it("should transact 'create'", async () => {
        const accountName = "test";
        const account = await blockchain.getAccount(accountName);
        try {
            const actionResult = await account.actions.create(
                {
                    name: "test",
                    age: 30,
                    city: "New York",
                },
                [
                    {
                        actor: "test",
                        permission: "active",
                    },
                ]
            );
            expect(actionResult).toHaveProperty("transaction_id");
        } catch (error) {
            throw error;
        }
    });
});
```

> Note that "ACTION_NAME" (e.g. `create`) is used as a key of `actions` object created by ABI. You should ensure that the parameters are correct input to send the action.

### Get table rows

```TypeScript
describe("hello", () => {
    ... // Code from previous example

    it("should have 1 person in people table", async () => {
        const accountName = "test";
        const account = await blockchain.getAccount(accountName);
        interface IUserRow {
            name: string;
            age: number;
            city: string;
        }
        const tableResult: IUserRow[] = await account.tables.people();
        expect(tableResult.length).toEqual(1);
        expect(tableResult[0].name).toEqual("test");
        expect(tableResult[0].age).toEqual(30);
        expect(tableResult[0].city).toEqual("New York");
    });
});
```

> Note that "TABLE_NAME" (e.g. `people`) is used as a key of `tables` object created by ABI. You should ensure that the parameters to find rows are correct input.

## 👍 References

-   [EOSIO: Smart Contract Guides: Data Persistence](https://developers.eos.io/welcome/v2.1/smart-contract-guides/data-persistence)
-   [Github/ibct-dev: led.public.contract](https://github.com/ibct-dev/led.public.contracts)
-   [Smart contract in EOSIO (Korean)](https://eosio.readthedocs.io/ko/latest/eosio-home/your-first-contract.html)

## 🧐 Implementation in MacOS (Arm64 - New Apple Chipset)

> In here, MacOS indicates the OS with Arm64 (New Apple Chipset, such as M1, M2, and so on).

You will encounter an error in MacOS after initializing this project.

The command:

```Bash
yarn run init
```

occurs the error:

```Bash
CMake Error in CMakeLists.txt:
  No cmake_minimum_required command is present.  A line of code such as

    cmake_minimum_required(VERSION 3.25)

  should be added at the top of the file.  The version specified may be lower
  if you wish to support older CMake versions for this project.  For more
  information run "cmake --help-policy CMP0000".
```

This error is essentially because `eosio-init` does not support new Apple chipset. Fortunately, the error can be easily avoided with only a few steps.

According to the error, you must add the below code into _`CMakeLists.txt`_, which is in your project directory (named as your contract name).

```Bash
cmake_minimum_required(VERSION 3.25)
```

> You can see the existing addition in _`CMakeLists.txt`_ of this project as default. Thus, the initial `yarn test` command does not cause the error.

In summary, follow these steps:

1. If you just want to test, `yarn test` can be processed successfully in default.
2. If you want to initialize as a new project, use `yarn run init`. However, the error will occur.
3. Add the above code into _`CMakeLists.txt`_.
4. Run `yarn test` to complete the initialization.

Now you can implement a new contract with test codes. Enjoy it!
