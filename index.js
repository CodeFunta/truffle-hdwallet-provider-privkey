const FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js')
const HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const NonceSubProvider = require('web3-provider-engine/subproviders/nonce-tracker.js');
const Web3 = require('web3')
const Transaction = require('ethereumjs-tx')
const ProviderEngine = require('web3-provider-engine')
const ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
const ethereumjsWallet = require('ethereumjs-wallet')

function HDWalletProvider (privateKeys, providerUrl) {
  const that = this;
  this.wallets = {};
  this.addresses = [];
  var type = typeof privateKeys;

  const addW = (key) => {
    key = key || '';
    var wallet = ethereumjsWallet.fromPrivateKey(Buffer.from(key.replace(/0x/g, ''), "hex"));
    var addr = '0x' + wallet.getAddress().toString('hex');
    that.addresses.push(addr);
    that.wallets[addr] = wallet;
  };
  if (type === 'string') {
    addW(privateKeys);
  }
  else {
    for (let key of privateKeys) {
      addW(key);
    }
  }
  
  const tmpAccounts = this.addresses;
  const tmpWallets = this.wallets;

  this.engine = new ProviderEngine()

  // from https://github.com/trufflesuite/truffle-hdwallet-provider/pull/66
  this.engine.addProvider(new NonceSubProvider())
  this.engine.addProvider(
    new HookedSubprovider({
      getAccounts: function (cb) {
        cb(null, tmpAccounts)
      },
      getPrivateKey: function (address, cb) {
        if (!tmpWallets[address]) {
          return cb('Account not found')
        } else {
          cb(null, tmpWallets[address].getPrivateKey().toString('hex'))
        }
      },
      signTransaction: function (txParams, cb) {
        let pkey
        if (tmpWallets[txParams.from]) {
          pkey = tmpWallets[txParams.from].getPrivateKey()
        } else {
          cb('Account not found')
        }
        var tx = new Transaction(txParams)
        tx.sign(pkey)
        var rawTx = '0x' + tx.serialize().toString('hex')
        cb(null, rawTx)
      }
    })
  )
  this.engine.addProvider(new FiltersSubprovider());
  providerUrl = providerUrl.toLowerCase();
  if (providerUrl.startWith("wss://") || providerUrl.startWith("ws://")) {
    this.engine.addProvider(new ProviderSubprovider(new Web3.providers.WebsocketProvider(providerUrl)));  
  }
  else{
    this.engine.addProvider(new ProviderSubprovider(new Web3.providers.HttpProvider(providerUrl)));
  }
  
  this.engine.start(); // Required by the provider engine.
}

HDWalletProvider.prototype.sendAsync = function () {
  this.engine.sendAsync.apply(this.engine, arguments)
}

HDWalletProvider.prototype.send = function () {
  return this.engine.send.apply(this.engine, arguments)
}

// returns the address of the given address_index, first checking the cache
HDWalletProvider.prototype.getAddress = function (idx) {
  console.log('getting addresses', this.addresses[0], idx)
  if (!idx) {
    return this.addresses[0]
  } else {
    return this.addresses[idx]
  }
}

// returns the addresses cache
HDWalletProvider.prototype.getAddresses = function () {
  return this.addresses
}

module.exports = HDWalletProvider
