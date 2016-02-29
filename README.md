
# Setting up / launching console

Requirements:

* Genesis file
* Custom data directory

## Genesis file

The genesis file is the first block of the local blockchain.

Here's an example genesis file:

```
{
    "nonce": "0xcafebabecafebabe",
    "timestamp": "0x0",
    "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "extraData": "0x0",
    "gasLimit": "0xfffffff",
    "difficulty": "0x400",
    "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "coinbase": "0x3333333333333333333333333333333333333333",
    "alloc": {
    }
}
```

## Custom data directory

To store the blockchain use a directory like `.localchain`.  So:

```
$ mkdir .localchain
```

## The rest

Command line options I'll need:

* Specify the genesis file via  `--genesis GENESIS_FILE`.
* `--nodiscover` ensures the local node is not discoverable by others.  Similarly
* `--maxpeers 0` ensures that nobody else can join.
* `--datadir foo` specifies the directory to store the local blockchain in
* `--networkid foo` specifies the id for the local network

So, to get started:

```
$ geth --genesis genesis.json \
  --datadir .localchain --networkid 3443 --nodiscover --maxpeers 0 console
```

All `geth` commands that want to use that network/blockchain must specify that
as well.

An account is needed, so:

```
$ geth --genesis genesis.json \
  --datadir .localchain --networkid 3443 --nodiscover --maxpeers 0 account new
```

# Mining

Set the miner's Etherbase to the desired account, e.g.

```
> var jtobin = eth.accounts[0];
> miner.setEtherbase(jtobin);
```

Then kick it off by specifying a number of threads to mine with:

```
> miner.start(2);
> miner.stop(2);
```

The genesis block can also be used to pre-allocate a bunch of ether.

To check the state of the pending block, use `eth.getBlock('pending', true)`.
There's also `eth.getBlock('latest')`.

# Gas

Gas is the cost paid to miners for executing instructions on the blockchain.

The price of one unit of gas is decided by the miners on the network (who may
specify gas limits for operations they will process).

You can't actually own gas; it's an internal fee that gets translated to ether
in payments.

Operations on the EVM have a gas cost, but gas itself also has a gas price
measured in ether.  Every transaction specifies the gas price it is willing to
pay for each unit of gas, allowing the market to decide the relationship
between the price of ether and the cost of computation. (from [here][gas]).

To authorize an account to spend gas, do e.g.

```
> personal.unlockAccount(jtobin)
```

# Contracts

Here is an example contract written in Solidity.

```
/* two contracts in this code */

contract mortal {
  /* variable owner has type address */
  address owner;

  /* executed at init; sets message sender as owner */
  function mortal() { owner = msg.sender; }

  /* terminates contract */
  function kill() { if (msg.sender == owner) suicide(owner); }
}

contract greeter is mortal {
  string greeting;

  /* runs when contract is executed */
  function greeter(string _greeting) public {
    greeting = _greeting;
  }

  /* 'main' */
  function greet() constant returns (string) {
    return greeting;
  }
}
```

It needs to be compiled down to EVM code and such.  So here's how you can do
that:

```
var greeterSource = 'contract mortal { address owner; function mortal() { owner = msg.sender; } function kill() { if (msg.sender == owner) suicide(owner); } } contract greeter is mortal { string greeting; function greeter(string _greeting) public { greeting = _greeting; } function greet() constant returns (string) { return greeting; } }';

var greeterCompiled = web3.eth.compile.solidity(greeterSource);
```

Note that the source needs to fit in a Javascript string.

Now one needs to create a contract from the compiled ABI (application binary
interface):

```
var greeterContract = web3.eth.contract(greeterCompiled.greeter.info.abiDefinition);
```

Then one can use a standard create method to deploy it to the network.  Note
that the deploying account must be authorized to spend gas; see [gas](#gas) for
that.

Here I'm deploying from jtobin's account.  The gas price is set to 300k wei:

```
var greeter = greeterContract.new(
    'hello world.'
  , { from:jtobin, data: greeterCompiled.greeter.code, gas: 300000 }
  , function(e, contract) {
      if(!e) {
        if(!contract.address) {
          console.log(
            "Contract transaction send: TransactionHash: " +
            contract.transactionHash +
            " waiting to be mined...");
          } else {
            console.log("Contract mined!  Address: " + contract.address);
            console.log(contract);
          }
        }
    })
```

The first arguments to 'new' are the arguments that the contract takes,
followed by metadata and a callback.

If there are any errors you'll be able to see them in the `transactionHash` of
the contract.

To be executed the contract actually needs to be mined first.

[gas]: https://ethereum.stackexchange.com/questions/3/what-is-meant-by-the-term-gas

