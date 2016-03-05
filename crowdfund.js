
var jtobin = eth.accounts[0];
miner.setEtherbase(jtobin);

personal.unlockAccount(jtobin, 'CNobor3sfSXed9cgKKMv');
eth.sendTransaction({
    from: jtobin
  , to: eth.accounts[1]
  , value: web3.toWei(100, 'ether')
  , gas: 1000000
  });

/* crowdfunding contract */

var crowdSrc = "contract token { mapping (address => uint) public coinBalanceOf; event CoinTransfer(address sender, address receiver, uint amount); function token(uint supply) { if (supply == 0) supply = 10000; coinBalanceOf[msg.sender] = supply; } function sendCoin(address receiver, uint amount) returns(bool sufficient) { if (coinBalanceOf[msg.sender] < amount) return false; coinBalanceOf[msg.sender] -= amount; coinBalanceOf[receiver] += amount; CoinTransfer(msg.sender, receiver, amount); return true; } } contract Crowdsale { address public beneficiary; uint public fundingGoal; uint public amountRaised; uint public deadline; uint public price; token public tokenReward; Funder[] public funders; event FundTransfer(address backer, uint amount, bool isContribution); struct Funder { address addr; uint amount; } /* runs on init */ function Crowdsale( address _beneficiary , uint _fundingGoal , uint _duration , uint _price , token _reward) { beneficiary = _beneficiary; fundingGoal = _fundingGoal; deadline    = now + _duration * 1 minutes; price       = _price; tokenReward = token(_reward); } /* the anon function is the default function called on receipt of funds */ function () { uint amount = msg.value; funders[funders.length++] = Funder({ addr: msg.sender, amount: amount }); amountRaised += amount; tokenReward.sendCoin(msg.sender, amount / price); FundTransfer(msg.sender, amount, true); } modifier afterDeadline() { if (now >= deadline) _ } function checkGoalReached() afterDeadline { if (amountRaised >= fundingGoal) { beneficiary.send(amountRaised); FundTransfer(beneficiary, amountRaised, false); } else { FundTransfer(0, 11, false); /* wat */ for (uint i = 0; i < funders.length; ++i) { funders[i].addr.send(funders[i].amount); FundTransfer(funders[i].addr, funders[i].amount, false); } } suicide(beneficiary); } }";

var crowdCompiled = eth.compile.solidity(crowdSrc);

var tokenContract = eth.contract(crowdCompiled.token.info.abiDefinition);

var token = tokenContract.new(
    10000
  , { from: jtobin
    , data: crowdCompiled.token.code
    , gas:  3000000
    }
  , function(e, contract) {
      if(!e) {
        if(!contract.address) {
        console.log(
          "contract transaction send: hash " +
          contract.transactionHash + " waiting to be mined");
      } else {
        console.log("contract mined, address " + contract.address);
      }
    }
  })

miner.start(2);
admin.sleepBlocks(5);
miner.stop(2);

var crowdContract = eth.contract(crowdCompiled.Crowdsale.info.abiDefinition);

var _beneficiary = jtobin;
var _fundingGoal = parseInt(web3.toWei(100, 'ether'));
var _duration    = 10;
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
    , gas: 3000000
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

miner.start(2);
admin.sleepBlocks(5);
miner.stop(2);

token.sendCoin.sendTransaction(crowdsale.address, 5000, { from: jtobin });

console.log(
    "Current crowdsale must raise "
  + web3.fromWei(crowdsale.fundingGoal.call(), "ether")
  + " ether in order to send it to "
  + crowdsale.beneficiary.call() + ".");

var fundWatcher = crowdsale.FundTransfer({}, '', function(error, result) {
  if (!error) {
    if (result.args.isContribution) {
      console.log("\n new backer; received "
        + web3.fromWei(result.args.amount, 'ether') + " ether from "
        + result.args.backer);
      console.log("\n current funding is at "
      + (100 * crowdsale.amountRaised.call() / crowdsale.fundingGoal.call())
      + "% of goal.");
      console.log("\n funders have contributed "
      + web3.fromWei(crowdsale.amountRaised.call(), 'ether') + " ether.");

      var timeLeft = Math.floor(Date.now() / 1000) - crowdsale.deadline();

      if (timeLeft > 3600) {
        console.log('deadline passed ' + Math.floor(timeLeft / 3600)
          + ' hours ago.');
        } else if (timeLeft > 0) {
        console.log('deadline passed ' + Math.floor(timeLeft / 60)
          + ' minutes ago.');
        } else if (timeLeft > -3600) {
        console.log(Math.floor(-1 * timeLeft / 60)
          + ' minutes until deadline.');
        } else {
          console.log(Math.floor(-1 * timeLeft / 3600)
            + ' hours until deadline.');
          }
      } else {
        console.log('funds transferred from crowdsale account:\n'
          + web3.fromWei(result.args.amount, 'ether')
          + ' ether to ' + result.args.backer);
      }
    }
  });

personal.unlockAccount(eth.accounts[1], 'password');
eth.sendTransaction({
    from:  eth.accounts[1]
  , to:    crowdsale.address
  , value: web3.toWei(10, 'ether')
  , gas:   1000000
  });

eth.sendTransaction({
    from:  eth.accounts[1]
  , to:    crowdsale.address
  , value: web3.toWei(90, 'ether')
  , gas:   1000000
  });

personal.unlockAccount(jtobin, 'CNobor3sfSXed9cgKKMv');

/* must be run after deadline */
crowdsale.checkGoalReached.sendTransaction({
    from: jtobin
  , gas:  1000000
  });

