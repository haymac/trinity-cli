#!/usr/bin/env node

'use strict'

process.env.TRINITY_STATE = '{}'

const pkg = require('./package.json')
const Configstore = require('configstore')
const defaultConfig = require('./defaultConfig')
const Vorpal = require('vorpal')
const chalk = Vorpal().chalk
const os = require('os')
const fs = require('fs')
const Kucoin = require('kucoin-api')

const logdir = os.homedir() + '/.trinity/'

if (!fs.existsSync(logdir)) {
  fs.mkdirSync(logdir)
}

const updateNotifier = require('update-notifier')
let notifier = updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // 1 day
})

const winston = require('winston')

let networkConnection = true

let matrixState = 0

winston
  .add(winston.transports.File, {
    filename: logdir + '/trinity.log',
    level: 'debug'
  })
  .remove(winston.transports.Console)

const g = require('./lib/global')
const conf = new Configstore(pkg.name, defaultConfig)
g.set('conf', conf.get())

const wallet = require('./lib/wallet')
const tokens = require('./lib/tokens')
const transactions = require('./lib/transactions')
const network = require('./lib/network')
const contacts = require('./lib/contacts')
const trade = require('./lib/trade')
const matrix = require('./lib/matrix')

const trinity = Vorpal()
  .delimiter(chalk.dim.green('[' + network.get() + '] ') + chalk.green('trinity') + chalk.green(' >'))
  .history('trinity-command-history')
  .show()

const exitCmd = trinity.find('exit')
if (exitCmd) {
  exitCmd.remove()
}

trinity
  .command('exit')
  .action(function (args, cb) {
    let self = this
    conf.set(g.get('conf'))
    process.exit()
  })

trinity.help(() => {
  let result = ''
  let width = 0

  result += "\n"
  result += chalk.green(' Commands:') + "\n"

  for (let command in trinity.commands) {
    let cmd = trinity.find(trinity.commands[command]._name)
    let cmdName = cmd._name + (cmd.options.length ? ' [options]' : '')
    if (cmdName.length > width) {
      width = cmdName.length
    }
  }

  for (let command in trinity.commands) {
    let cmd = trinity.find(trinity.commands[command]._name)
    let cmdName = cmd._name + (cmd.options.length ? ' [options]' : '')
    if (!cmd._hidden) {
      result += chalk.green("\n" + '    ') + chalk.bold.green(trinity.util.pad(cmdName, width)) + '    ' + chalk.green(cmd._description)
    }
  }

  result += "\n"

  return result
})

trinity.log(chalk.bold.green("\n" + ' Wake up, Neo… ' + "\n"))

updateCheck(trinity, notifier)

trinity
  .command('send neo', 'Send NEO from one of your addresses to one of your contacts.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.sendNeo(self, args, cb)
  })

trinity
  .command('send gas', 'Send GAS from one of your addresses to one of your contacts.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.sendGas(self, args, cb)
  })

trinity
  .command('wallet list', 'List available wallets.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.list(self, args, cb)
  })

trinity
  .command('wallet show', 'Select an address to show its balances, transactions, claimables, etc.')
  .option('-t, --transaction <txid>', 'Show details for a specific transaction ID.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    if (args.options && args.options.transaction) {
      transactions.show(self, args, cb)
    } else {
      wallet.show(self, args, cb)
    }
  })

trinity
  .command('wallet create', 'Creates a new wallet address.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.create(self, args, cb)
  })

trinity
  .command('wallet import', 'Import an existing private key in WIF format.')
  .option('-l, --ledger', 'Import address from Ledger Nano S.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    if (args.options.ledger) {
      wallet.importLedger(self, args, cb)
    } else {
      wallet.import(self, args, cb)
    }
  })

trinity
  .command('wallet remove', 'Select an address to remove from local storage.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.remove(self, args, cb)
  })

trinity
  .command('wallet clear', 'Purge all wallet information from local storage.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.clear(self, args, cb)
  })

trinity
  .command('token list', 'List available tokens.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    tokens.list(self, args, cb)
  })

trinity
  .command('token add', 'Add a new token hash.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    tokens.add(self, args, cb)
  })

trinity
  .command('token remove', 'Remove a token hash.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    tokens.remove(self, args, cb)
  })

trinity
  .command('contact list', 'List your contacts.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    contacts.list(self, args, cb)
  })

trinity
  .command('contact add', 'Add a new contact.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    contacts.add(self, args, cb)
  })

trinity
  .command('contact remove', 'Remove an existing contact.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    contacts.remove(self, args, cb)
  })

trinity
  .command('contact clear', 'Purge all contact information from local storage.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    contacts.clear(self, args, cb)
  })

trinity
  .command('claim gas', 'Claim all available and unavailable gas.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.claimAllGas(self, args, cb)
  })

trinity
  .command('network', 'Switch to a different network.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    network.set(self, args, cb)
  })

trinity
  .command('trade', 'Configure, lock, or unlock your KuCoin API credentials for trading.')
  .option('-c, --configure', 'Configure your KuCoin API credentials.')
  .option('-u, --unlock', 'Unlock your KuCoin API credentials for this Trinity session.')
  .option('-l, --lock', 'Lock your KuCoin API credentials for this Trinity session.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    if (args.options.unlock) {
      trade.unlock(self, args, cb)
    } else if (args.options.lock) {
      trade.lock(self, args, cb)
    } else if (args.options.configure) {
      trade.config(self, args, cb)
    } else {
      trade.state(self, args, cb)
    }
  })

trinity
  .command('trade balance', 'Get trading balance from KuCoin.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    trade.balance(self, args, cb)
  })

trinity
  .command('trade orders', 'Get current active orders from KuCoin.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    trade.orders(self, args, cb)
  })

trinity
  .command('trade create', 'Create a new order on KuCoin.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    trade.create(self, args, cb)
  })

trinity
  .command('trade cancel', 'Cancel an order on KuCoin.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    trade.cancel(self, args, cb)
  })

trinity
  .command('trade withdraw', 'Withdraw funds from KuCoin.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    trade.withdraw(self, args, cb)
  })

trinity
  .command('version', 'Show Trinity version information.')
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this

    let output = "\n"
    output += chalk.bold.green('Trinity v' + pkg.version) + "\n"
    output += chalk.green(pkg.description) + "\n"
    output += chalk.green(pkg.homepage) + "\n"
    output += "\n"
    output += chalk.green('Written by ' + pkg.author + ' and released under the ' + pkg.license + ' license.') + "\n"
    output += chalk.green('Please report any bugs you discover to ' + pkg.bugs.url) + "\n"
    output += "\n"
    output += chalk.green('Uses the Neon JS library and Neon API by Ethan Fast and City of Zion (http://cityofzion.io/)') + "\n"

    self.log(output)

    cb()
  })

trinity
  .catch('[words...]', 'Catches all unlisted commands.')
  .hidden()
  .action(function (args, cb) {
    let self = this
    let cmd = args.words.join(' ')

    self.log('')
    self.log(chalk.red(' `' + cmd + '` is not a valid Trinity command.'))
    self.help()

    cb()
  })

trinity.on('keypress', (e) => {
  if (e.key == 'x' && e.e.key.ctrl && matrixState == 0) {
    matrixState = matrix.do(trinity, matrixState)
  }
  if (e.key == 'escape' && matrixState == 1) {
    matrixState = matrix.do(trinity, matrixState)
  }
})

function commandHelp(args, cb) {
  let cmd = trinity.find(args)

  let result = ''
  let width = 0

  result += "\n"
  result += chalk.green(' Usage: ' + cmd._name) + "\n"
  result += "\n"
  result += chalk.green(' ' + cmd._description) + "\n"

  if (cmd.options.length > 0) {
    let optWidth = 0
    result += "\n"
    result += chalk.green(' Options:') + "\n"

    for (let option in cmd.options) {
      let opt = cmd.options[option]
      if (opt.flags.length > optWidth) {
        optWidth = opt.flags.length
      }
    }

    for (let option in cmd.options) {
      let opt = cmd.options[option]
      result += '     ' + chalk.green(trinity.util.pad(opt.flags, optWidth)) + '    ' + chalk.green(opt.description) + "\n"
    }
  }

  cb(result)
}

function updateCheck(trinity, notifier) {
  let update = notifier.update

  if (update != undefined) {
    if (update.latest > update.current) {
      trinity.log(chalk.bold.green(' Update available ' + update.current + ' → ' + update.latest))
      trinity.log(chalk.green(' Run "npm install -g trinity-cli" to update'))
      trinity.log('')
    }
  }
}

wallet.updateBalances(trinity)
var trinityLoop = setInterval(() => {
  conf.set(g.get('conf'))
  tokens.update(trinity)
  wallet.updateBalances(trinity)
  wallet.updateClaimables(trinity)
  updateCheck(trinity, notifier)
}, 5000)
