
var jtobin = eth.accounts[0];
miner.setEtherbase(jtobin);
personal.unlockAccount(jtobin, 'CNobor3sfSXed9cgKKMv');

var daoSrc = 'contract share { mapping (address => uint) public register; address sender = msg.sender; function share(uint shares) { if (shares == 0) shares = 10; register[sender] = shares; } event ShareTransfer(address sender, address receiver, uint shares); function distribute(address receiver, uint shares) returns(bool sufficient) { if (register[sender] < shares) return false; register[sender]   -= shares; register[receiver] += shares; ShareTransfer(sender, receiver, shares); return true; } } contract pushforward { address public founder; uint public minimumQuorum; uint public debatingPeriod; share public voterShare; function pushforward( share _voterShareAddress, uint _minimumQuorum, uint _debatingPeriod) { founder        = msg.sender; voterShare     = share(_voterShareAddress); minimumQuorum  = _minimumQuorum; debatingPeriod = _debatingPeriod * 1 minutes; } struct Vote { int position; address voter; } struct Proposal { address recipient; uint amount; bytes32 data; string description; uint creationDate; bool active; Vote[] votes; mapping (address => bool) voted; } Proposal[] public proposals; uint public numProposals; event Voted(uint proposalId, int position, address voter); event ProposalTallied(uint proposalId, int result, uint quorum, bool active); event ProposalAdded( uint proposalId , address recipient , uint amount , bytes32 data , string description); function newProposal( address _recipient, uint _amount, bytes32 _data, string _description) returns (uint proposalId) { if (voterShare.register(msg.sender) > 0) { proposalId = proposals.length++; Proposal p = proposals[proposalId]; p.recipient = _recipient; p.amount = _amount; p.data = _data; p.description = _description; p.creationDate = now; p.active = true; ProposalAdded(proposalId, _recipient, _amount, _data, _description); numProposals = proposalId + 1; } } function vote(uint _proposalId, int _position) returns (uint voteId) { if (voterShare.register(msg.sender) > 0 && (_position >= -1 && _position <= 1)) { Proposal p = proposals[_proposalId]; if (p.voted[msg.sender]) return; voteId = p.votes.length++; p.votes[voteId] = Vote( { position: _position , voter: msg.sender }); p.voted[msg.sender] = true; Voted(_proposalId, _position, msg.sender); } } function executeProposal(uint _proposalId) returns (int result) { Proposal p = proposals[_proposalId]; if (now > (p.creationDate + debatingPeriod) && p.active) { uint quorum = 0; for (uint i = 0; i < p.votes.length; i++) { Vote v = p.votes[i]; uint voteWeight = voterShare.register(v.voter); quorum += voteWeight; result += int(voteWeight) * v.position; } if (quorum > minimumQuorum && result > 0) { p.recipient.call.value(p.amount)(p.data); p.active = false; } else if (quorum > minimumQuorum && result < 0) { p.active = false; } ProposalTallied(_proposalId, result, quorum, p.active); } } }';

var daoCompiled = eth.compile.solidity(daoSrc);

var shareContract = eth.contract(daoCompiled.share.info.abiDefinition);

var share = shareContract.new(
    10000
  , { from: jtobin
    , data: daoCompiled.share.code
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
  });

miner.start(2);
admin.sleepBlocks(5);
miner.stop(2);

var daoContract = eth.contract(daoCompiled.pushforward.info.abiDefinition);

var _voterShareAddress = share.address;
var _minimumQuorum     = 10;
var _debatingPeriod    = 60;

var pushforward = daoContract.new(
    _voterShareAddress
  , _minimumQuorum
  , _debatingPeriod
  , { from: jtobin, data: daoCompiled.pushforward.code, gas: 3000000 }
  , function(e, contract) {
      if (!e) {
        if (!contract.address) {
          console.log(
              "contract transaction send: "
            + contract.transactionHash + " waiting to be mined");
        } else {
          console.log("contract mined: " + contract.address);
        }
      }
    });

miner.start(2);
admin.sleepBlocks(5);
miner.stop(2);

