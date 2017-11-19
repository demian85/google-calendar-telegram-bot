'use strict';

require('dotenv').config();

const Bot = require('./lib/Bot.js');

const bot = new Bot();

bot.start();
