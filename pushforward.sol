contract share {
  mapping (address => uint) public register;
  event ShareTransfer(address sender, address receiver, uint shares);

  function share(uint shares) {
    if (shares == 0) shares = 10;
    register[msg.sender] = shares;
  }

  function distribute(address receiver, uint shares) returns (bool b) {
    address sender = msg.sender;
    if (register[sender] < shares) return false;
    register[sender]   -= shares;
    register[receiver] += shares;
    ShareTransfer(sender, receiver, shares);
    return true;
  }
}

contract pushforward {
  share public issued;
  address[] public directors;
  address[] public executives;
  mapping (address => uint) public investors;
  mapping (address => uint) public register;

  event AppointDirector(address director);
  event RemoveDirector(address director);
  event AppointExecutive(address executive);
  event RemoveExecutive(address executive);
  event IssueShares(uint amount);

  function pushforward(uint shares) {
    directors.push(msg.sender);
    AppointDirector(msg.sender);

    executives.push(msg.sender);
    AppointExecutive(msg.sender);

    issued = if (shares == 0) { shares = 10; }
    share(shares);
    IssuesShares(shares);

    issued.distribute(msg.sender, shares);
    register[msg.sender] = shares;

    investors[msg.sender] += msg.value;
  }

  // not everyone who transfers money to the contract is an investor
  // function () {
  //   investors[msg.sender] += msg.value;
  // }

}

// TODO
//
// name register
// constitution
// version
// date formed
// appoint/remove directors (by majority vote of directors, shareholders)
// appoint/remove executive (by majority vote of directors)
// change constitution (by majority vote of directors)
// send funds (if executive)
// dissolve company (by majority vote of directors)
// majority vote mechanism itself should weight ownership more heavily (or something)
// more events, event handling
// public vs private properties
