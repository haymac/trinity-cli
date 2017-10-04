#!/usr/bin/env node

'use strict'

const pkg = require('./package.json')
const Configstore = require('configstore')
const defaultConfig = require('./defaultConfig')
const Vorpal = require('vorpal')
const chalk = Vorpal().chalk
const wallet = require('./lib/wallet')
const network = require('./lib/network')

const conf = new Configstore(pkg.name, defaultConfig)

const trinity = Vorpal()
  .delimiter(chalk.dim.green('[' + network.get() + '] ') + chalk.green('trinity') + chalk.green(' >'))
  .history('trinity-command-history')
  .show()

trinity.log(chalk.bold.green("\n" + ' Wake up, Neo… ' + "\n"))

trinity
  .command('wallet create', 'Creates a new wallet address.')
  .action(function (args, cb) {
    let self = this
    wallet.create(self, args, cb)
  })

trinity
  .command('wallet list', 'List available wallets.')
  .action(function (args, cb) {
    let self = this
    wallet.list(self, args, cb)
  })

trinity
  .command('wallet remove', 'Select an address to remove from local storage.')
  .action(function (args, cb) {
    let self = this
    wallet.remove(self, args, cb)
  })

trinity
  .command('wallet clear', 'Purge all wallet information from local storage.')
  .action(function (args, cb) {
    let self = this
    wallet.clear(self, args, cb)
  })

trinity
  .command('network', 'Switch to a different network.')
  .action(function (args, cb) {
    let self = this
    network.set(self, args, cb)
  })