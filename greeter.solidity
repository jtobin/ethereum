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

