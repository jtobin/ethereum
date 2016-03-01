
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

Alternatively one can create an account from the console:

```
> personal.newAccount();
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

Note the existence of [this bug][bug].  It can possibly be alleviated by
allocating sufficient memory to the enclosing VM and restarting it, i.e. via
`vagrant halt`.

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
