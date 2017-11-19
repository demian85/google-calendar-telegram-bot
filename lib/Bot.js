'use strict';

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const GoogleAuth = require('google-auth-library');
const MongoClient = require('mongodb').MongoClient;

const StringParser = require('./StringParser');
const GPlug = require('./GPlug.js');

const gplug = new GPlug();
const auth = new GoogleAuth();

function getHelpText() {
  return `You can just add an event to your default calendar by sending a message to the bot by following these rules (only spanish for now):

<event name>, <when>, <reminder>

<when> can be specified using multiple formats. Examples:

    * mañana 18 (mañana a las 18hs)
    * hoy 16 (hoy a las 16hs)
    * mie 8-10 (próximo Miércoles de 8 a 10hs)
    * lun 9:30 (próximo Lunes 9:30am)
    * abr 10 (10 de Abril, todo el día)
    * sep 2 9:30-10:45 (2 de Septiembre de 9:30 a 10:45am)

<reminder> is optional. Examples:

    * 10m (10 minutos antes)
    * 1h (1 hora antes)
    * 1d (1 día antes)

Full examples:

    * entrevista mañana 9 12h`;
}

class Bot {

  constructor() {
    let credentials;
    try {
      credentials = JSON.parse(fs.readFileSync(process.env.CLIENT_CREDENTIALS_FILE));
    } catch(e) {
      throw new Error('Unable to load credentials file');
    }
    this.appCredentials = {
      id: credentials.installed.client_id,
      secret: credentials.installed.client_secret,
      redirectUrl: credentials.installed.redirect_uris[0]
    };
    this.stringParser = new StringParser();
    this.timeZone = 'America/Argentina/Buenos_Aires';
    this.lang = 'es';
    moment.locale(this.lang);
  }

  start() {
    MongoClient.connect(process.env.MONGODB_URI).then(db => {
      this.db = db;
      this._initBot();
    })
      .catch(err => {
        console.log(err.stack);
      });
  }

  _initBot() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    this.bot.on('message', msg => {
      const userId = msg.from.id;
      const text = msg.text.trim();
      this._checkAuth(userId).then(user => {
        if (!user || text === '/start') {
          // first message, send auth url
          this._sendAuthUrl(userId);
        } else if (!user.credentials) {
          // pending authorization, check code and store credentials
          this._doAuth(userId, text);
        } else {
          let oauth2Client = this._createAuthClient(user.credentials);
          if (!/^\//.test(text)) {
            // client is authorized, parse text and add event
            let eventData = this._createEventFromInput(text);
            if (!eventData) {
              this.bot.sendMessage(userId, 'Unable to parse text, please try again.');
            } else {
              this._addEvent(oauth2Client, eventData).then(eventDetails => {
                this.bot.sendMessage(userId, 'Event successfully created!\n\n' + eventDetails);
              }).catch(this._handleError(userId));
            }
          } else {
            this._parseCmd(user, text, oauth2Client).then(output => {
              this.bot.sendMessage(userId, output);
            }).catch(this._handleInvalidCommand(userId));
          }
        }
      }).catch(this._handleError(userId));
    });
  }

  _createAuthClient(credentials) {
    let oauth2Client = new auth.OAuth2(this.appCredentials.id, this.appCredentials.secret, this.appCredentials.redirectUrl);
    if (credentials) {
      oauth2Client.setCredentials(credentials);
    }
    return oauth2Client;
  }

  _checkAuth(userId) {
    return this.db.collection('clients').findOne({ userId: userId });
  }

  _addEvent(oauth2Client, eventData) {
    return new Promise((resolve, reject) => {
      eventData.auth = oauth2Client;
      gplug.addEvent(eventData).then((response) => {
        const startDate = moment(response.start.dateTime);
        const endDate = moment(response.end.dateTime);
        let friendlyResponse = response.summary;
        friendlyResponse += '\nComienza: ' + startDate.calendar();
        friendlyResponse += '\nFinaliza: ' + endDate.calendar();
        friendlyResponse += '\nRecordatorios: ' + (response.reminders.useDefault ? 'default, ' : '') + ((response.reminders.overrides || []).map((item) => {
          return endDate.clone().diff(endDate.clone().subtract(item.minutes, 'minutes'), 'minutes') + ' minutos antes';
        })).join(', ');
        friendlyResponse += '\nLink: ' + response.htmlLink;
        resolve(friendlyResponse);
      }).catch(reject);
    });
  }

  _doAuth(userId, authCode) {
    return new Promise((resolve, reject) => {
      const oauth2Client = this._createAuthClient();
      oauth2Client.getToken(authCode, (err, credentials) => {
        if (err) {
          return reject(new Error('Error trying to retrieve access token: ' + err.message));
        }
        this.db.collection('clients').updateOne({ userId: userId }, { $set: { credentials: credentials } })
          .then(() => {
            this.bot.sendMessage(userId, 'Successfully authorized! You can start using me now! Type /help for instructions.');
          })
          .catch(this._handleError(userId));
      });
    });
  }

  _sendAuthUrl(userId) {
    const oauth2Client = this._createAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/calendar'
    });
    this.bot.sendMessage(userId, 'You must first authorize me! Open the following link and send me the activation code:\n' + authUrl).then(() => {
      this.db.collection('clients').insertOne({ userId: userId }).catch(this._handleError(userId));
    });
  }

  _createEventFromInput(text) {
    const result = this.stringParser.parse(this.lang, text);
    if (!result) return null;
    let eventData = {
      calendarId: 'primary',
      resource: {
        summary: result.text,
        start: {
          dateTime: result.start,
          timeZone: this.timeZone
        },
        end: {
          dateTime: result.end,
          timeZone: this.timeZone
        }
      }
    };
    if (result.reminder) {
      eventData.resource.reminders = {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: result.reminder }
        ]
      };
    }
    return eventData;
  }

  _parseCmd(user, text, oauth2Client) {
    return new Promise((resolve, reject) => {
      switch (text) {
        case '/help':
          return resolve(getHelpText());
        case '/list':
          return resolve(gplug.listEvents(oauth2Client));
        default:
          reject(new Error('Invalid command: ' + text));
      }
    });
  }

  _handleError(userId) {
    return (err) => {
      console.log(err.stack);
      this.bot.sendMessage(userId, 'Unexpected error occurred: ' + err.message);
    };
  }

  _handleInvalidCommand(userId) {
    return (err) => {
      console.log(err.stack);
      this.bot.sendMessage(userId, err.message);
    };
  }
}

module.exports = Bot;
