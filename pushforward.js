
function report(e, contract) {
  if (!e) {
    if (!contract.address) {
      console.log(
          'transaction w/hash '
        + contract.transactionHash
        + ' waiting to be mined.');
    } else {
      console.log('contract mined, address ' + contract.address);
    }
  }
}

var jtobin = eth.accounts[0];
personal.unlockAccount(jtobin, 'CNobor3sfSXed9cgKKMv');

var pfsrc = 'contract share { mapping (address => uint) register; event ShareTransfer(address sender, address receiver, uint shares); function share(uint shares) { if (shares == 0) shares = 10; register[msg.sender] = shares; } function distribute(address receiver, uint shares) returns (bool b) { address sender = msg.sender; if (register[sender] < shares) return false; register[sender]   -= shares; register[receiver] += shares; ShareTransfer(sender, receiver, shares); return true; } } contract pushforward { share public issued; address[] public directors; address[] public executives; mapping (address => uint) investors; mapping (address => uint) public register; event AppointDirector(address director); event RemoveDirector(address director); event AppointExecutive(address executive); event RemoveExecutive(address executive); function pushforward(uint shares) { directors.push(msg.sender); AppointDirector(msg.sender); executives.push(msg.sender); AppointExecutive(msg.sender); issued = share(shares); issued.distribute(msg.sender, shares); register[msg.sender] = shares; investors[msg.sender] += msg.value; } }'

var pfcompiled      = eth.compile.solidity(pfsrc);
var pfshareContract = eth.contract(pfcompiled.share.info.abiDefinition);

var pfshare = pfshareContract.new(
    10
  , { from: jtobin, data: pfcompiled.share.code, gas: 3000000 }
  , function(e, contract) { report(e, contract) });

// var shareAddress = pfshare.address;
// 0xad32aa2b62dc8b41d36ec6aa01f98b209370efae

var pfdaoContract = eth.contract(pfcompiled.pushforward.info.abiDefinition);

// seed the company with a 100 ether gift
var pushforward = pfdaoContract.new(
    10
  , { from: jtobin
    , data: pfcompiled.pushforward.code
    , value: web3.toWei(100, 'ether')
    , gas:   3000000
    }
  , function(e, contract) { report(e, contract) });

// var pushforwardAddress = pushforward.address;
// "0x07d444045ec06de7f238bcd3941aa9fc50d9b759"

