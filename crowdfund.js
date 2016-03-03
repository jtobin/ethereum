
var jtobin = eth.accounts[0];
personal.unlockAccount(jtobin, 'CNobor3sfSXed9cgKKMv');
miner.setEtherbase(jtobin);

/* crowdfunding contract */

var crowdSrc = "contract token { mapping (address => uint) public coinBalanceOf; event CoinTransfer(address sender, address receiver, uint amount); function token(uint supply) { if (supply == 0) supply = 10000; coinBalanceOf[msg.sender] = supply; } function sendCoin(address receiver, uint amount) returns(bool sufficient) { if (coinBalanceOf[msg.sender] < amount) return false; coinBalanceOf[msg.sender] -= amount; coinBalanceOf[receiver] += amount; CoinTransfer(msg.sender, receiver, amount); return true; } } contract Crowdsale { address public beneficiary; uint public fundingGoal; uint public amountRaised; uint public deadline; uint public price; token public tokenReward; Funder[] public funders; event FundTransfer(address backer, uint amount, bool isContribution); struct Funder { address addr; uint amount; } /* runs on init */ function Crowdsale( address _beneficiary , uint _fundingGoal , uint _duration , uint _price , token _reward) { beneficiary = _beneficiary; fundingGoal = _fundingGoal; deadline    = now + _duration * 1 minutes; price       = _price; tokenReward = token(_reward); } /* the anon function is the default function called on receipt of funds */ function () { uint amount = msg.value; funders[funders.length++] = Funder({ addr: msg.sender, amount: amount }); amountRaised += amount; tokenReward.sendCoin(msg.sender, amount / price); FundTransfer(msg.sender, amount, true); } modifier afterDeadline() { if (now >= deadline) _ } function checkGoalReached() afterDeadline { if (amountRaised >= fundingGoal) { beneficiary.send(amountRaised); FundTransfer(beneficiary, amountRaised, false); } else { FundTransfer(0, 11, false); /* wat */ for (uint i = 0; i < funders.length; ++i) { funders[i].addr.send(funders[i].amount); FundTransfer(funders[i].addr, funders[i].amount, false); } } suicide(beneficiary); } }";

var crowdCompiled = eth.compile.solidity(crowdSrc);

var tokenContract = eth.contract(crowdCompiled.token.info.abiDefinition);

var token = tokenContract.new(
    10000
  , { from: jtobin
    , data: crowdCompiled.token.code
    , gas:  300000
    }
  , function(e, contract) {
      if(!e) {
        if(!contract.address) {
        console.log(
          "Contract transaction send: TransactionHash: " +
          contract.transactionHash + " waiting to be mined...");
      } else {
        console.log("Contract mined! Address: " + contract.address);
      }
    }
  })

miner.start(2);
admin.sleepBlocks(5);
miner.stop(2);

var crowdContract = eth.contract(crowdCompiled.Crowdsale.info.abiDefinition);

var _beneficiary = jtobin;
var _fundingGoal = parseInt(web3.toWei(100, 'ether'));
var _duration    = 5;
var _price       = parseInt(web3.toWei(0.02, 'ether'));
var _reward      = token.address;

var crowdsale = crowdContract.new(
    _beneficiary
  , _fundingGoal
  , _duration
  , _price
  , _reward
  , { from: jtobin
    , data: crowdCompiled.Crowdsale.code
    , gas: 300000
    }
  , function(e, contract) {
      if (!e) {
        if (!contract.address) {
          console.log(
            "contract transaction send: hash " + contract.transactionHash +
            " waiting to be mined.");
          } else {
            console.log("contract mined, address " + contract.address);
            }
        }});

