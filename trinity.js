#!/usr/bin/env node

'use strict'

const pkg = require('./package.json')
const Configstore = require('configstore')
const defaultConfig = require('./defaultConfig')
const Vorpal = require('vorpal')
const chalk = Vorpal().chalk

const winston = require('winston')

let networkConnection = true

winston
  .add(winston.transports.File, {
    filename: 'trinity.log',
    level: 'debug'
  })
  .remove(winston.transports.Console)

const wallet = require('./lib/wallet')
const network = require('./lib/network')
const contacts = require('./lib/contacts')

const conf = new Configstore(pkg.name, defaultConfig)

const trinity = Vorpal()
  .delimiter(chalk.dim.green('[' + network.get() + '] ') + chalk.green('trinity') + chalk.green(' >'))
  .history('trinity-command-history')
  .show()

trinity.help(() => {
  let result = ''
  let width = 0;

  result += "\n"
  result += chalk.green(' Commands:') + "\n"

  for (let command in trinity.commands) {
    let cmd = trinity.find(trinity.commands[command]._name)
    if (cmd._name.length > width) {
      width = cmd._name.length
    }
  }

  for (let command in trinity.commands) {
    let cmd = trinity.find(trinity.commands[command]._name)
    result += chalk.green("\n" + '    ') + chalk.bold.green(trinity.util.pad(cmd._name, width)) + '    ' + chalk.green(cmd._description)
  }

  result += "\n"

  return result
})

trinity.log(chalk.bold.green("\n" + ' Wake up, Neo… ' + "\n"))

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
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.show(self, args, cb)
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
  .help(commandHelp)
  .action(function (args, cb) {
    let self = this
    wallet.import(self, args, cb)
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

function commandHelp(args, cb) {
  let cmd = trinity.find(args)

  let result = ''
  let width = 0;

  result += "\n"
  result += chalk.green(' Usage: ' + cmd._name) + "\n"
  result += "\n"
  result += chalk.green(' ' + cmd._description) + "\n"

  cb(result)
}

wallet.updateBalances(trinity)
var trinityLoop = setInterval(() => {
  wallet.updateBalances(trinity)
  wallet.updateClaimables(trinity)
}, 5000)
