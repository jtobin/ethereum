
# Ethereum Notes

**NOTE (2017/06/07)**: These notes are out of date by about a year and a half
and are in some slow process of updating.

## Setting up / launching console

(Largely gleaned from [here][geth-private], [here][med-private], and
[here][ethdocs])

* Genesis file
* Custom data directory

## Genesis file

The genesis file is the first block of the local blockchain.

Here's an example genesis file, `genesis.json`:

```
{
    "config": {
        "chainId": 15,
        "homesteadBlock": 0,
        "eip155Block": 0,
        "eip158Block": 0
    },
    "difficulty": "200000000",
    "gasLimit": "2100000",
    "alloc": {
        "7df9a875a174b3bc565e6424a0050ebc1b2d1d82": { "balance": "300000" },
        "f41c74c9ae680c1aa78f42e5647a62f353b7bdde": { "balance": "400000" }
    }
}
```

## Custom data directory

To store the blockchain use a directory like `localchain`.  So:

```
$ mkdir localchain
```

## The rest

Command line options I'll need:

* `--nodiscover` ensures the local node is not discoverable by others.
* `--maxpeers 0` ensures that nobody else can join.
* `--datadir foo` specifies the directory to store the local blockchain in
* `--networkid foo` specifies the id for the local network

One can initialize the local blockchain like so:

```
$ geth --datadir localchain init genesis.json
```

Then to get started w/that blockchain and the console:

```
$ geth --datadir localchain --networkid 42 --nodiscover --maxpeers 0 console
```

One can create an account from the console like so:

```
> personal.newAccount();
Passphrase: <hoobajooba>
Repeat passphrase: <hoobajooba>
> eth.accounts;
["0x8a9f437f3965cc0354a095b8e9fa8162e6c98aad"]
```

# Mining

Set the miner's Etherbase to the desired account, e.g.

```
> var jtobin = eth.accounts[0];
> miner.setEtherbase(jtobin);
```

Then kick it off by specifying a number of threads to mine with:

```
> miner.start(1);
> miner.stop(1);
```

The first time you kick this off will involve generating a DAG, which takes
a few minutes.

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

Contracts are written in a high-level language; presently the most popular one
seems to be Solidity.

There are some restrictions.  There is no such thing as an active loop, etc. so
contracts always need to be pinged by someone.  Kind of annoying.

## Greeter
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

Contracts can specify a gas *limit* via the gas parameter.  For many contracts
you'd want this to be pretty large.  Previously I had tried to set this as low
as possible.

Here I'm deploying from jtobin's account.  The gas limit is set to 300k wei:

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

To be executed the contract actually needs to be mined.  See [mining](#mining).

## Token

Here's a more sophisticated contract example.  First the Solidity program.

```
contract token {
  mapping (address => uint) public coinBalanceOf;
  event CoinTransfer(address sender, address receiver, uint amount);

  function token(uint supply) {
    if (supply == 0) supply = 10000;
    coinBalanceOf[msg.sender] = supply;
    }

  function sendCoin(address receiver, uint amount) returns(bool sufficient) {
    if (coinBalanceOf[msg.sender] < amount) return false;
    coinBalanceOf[msg.sender] -= amount;
    coinBalanceOf[receiver] += amount;
    CoinTransfer(msg.sender, receiver, amount);
    return true;
    }
  }
```

Then the usual mumbojumbo - flatten, compile.

```
var tokenSource = 'contract token { mapping (address => uint) public coinBalanceOf; event CoinTransfer(address sender, address receiver, uint amount); function token(uint supply) { if (supply == 0) supply = 10000; coinBalanceOf[msg.sender] = supply; } function sendCoin(address receiver, uint amount) returns(bool sufficient) { if (coinBalanceOf[msg.sender] < amount) return false; coinBalanceOf[msg.sender] -= amount; coinBalanceOf[receiver] += amount; CoinTransfer(msg.sender, receiver, amount); return true; } }'

var tokenCompiled = eth.compile.solidity(tokenSource)
```

Now, to deploy:

```
var tokenContract = web3.eth.contract(tokenCompiled.token.info.abiDefinition);

var token = tokenContract.new(
    10000
  , { from:web3.eth.accounts[0]
    , data:tokenCompiled.token.code
    , gas: 1000000
    }
  , function(e, contract) {
      if(!e) {
        if(!contract.address) {
        console.log(
          "Contract transaction send: TransactionHash: " +
          contract.transactionHash + " waiting to be mined...");
      } else {
        console.log("Contract mined! Address: " + contract.address);
        console.log(contract);
      }
    }
  })
```

One can set up a 'watcher' in the console by hooking into the 'CoinTransfer'
event.  This is pretty cool; presumably one could deploy entire contracts based
on events:

```
var event = token.CoinTransfer({}, '', function(error, result) {
  if (!error) {
    console.log("coin transfer: " + result.args.amount + " tokens sent.");
    console.log(
      "balances:\n" +
      "sender " + result.args.sender + ": " +
        token.coinBalanceOf.call(result.args.sender) + "\n" +
      "receiver " + result.args.receiver + ": " +
        token.coinBalanceOf.call(result.args.receiver))
    }
  });
```

[gas]: https://ethereum.stackexchange.com/questions/3/what-is-meant-by-the-term-gas
[bug]: https://github.com/ethereum/go-ethereum/issues/2174
[geth-private]: https://github.com/ethereum/go-ethereum/wiki/Private-network
[med-private]: https://medium.com/blockchain-education-network/use-geth-to-setup-your-own-private-ethereum-blockchain-86f1200e6d40
[ethdocs]: http://www.ethdocs.org/en/latest/network/test-networks.html#setting-up-a-local-private-testnet
