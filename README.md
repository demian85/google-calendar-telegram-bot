# Telegram bot using Google Calendar API #

This bot can interact with Google Calendar API, allowing you to easily add/manage events.

This is currently up and running and you may use it: https://telegram.me/google_calendar_bot

English support with more features coming soon!

## Interaction ##

You can just add an event to your default calendar by sending a message to the bot following these rules (only spanish for now):

`<event name>, <when> <reminder>`

`<when>` can be specified using multiple formats. Examples:

    * mañana 18 (mañana a las 18hs)
    * hoy 16 (hoy a las 16hs)
    * mie 8-10 (próximo Miércoles de 8 a 10hs)
    * lun 9:30 (próximo Lunes 9:30am)
    * abr 10 (10 de Abril, todo el día)
    * sep 2 9:30-10:45 (2 de Septiembre de 9:30 a 10:45am)

`<reminder>` is optional. Examples:

    * 10m (10 minutos antes)
    * 1h (1 hora antes)
    * 1d (1 día antes)

Full examples:

    * entrevista, mañana 9, 12h
    * cumple de pepe, vie 20

## Setup ##

    * Create a bot: https://core.telegram.org/bots
    * Create a config.json file in the root directory with the same schema as config-default.json
    * Register your app using Google developers console: https://console.developers.google.com/
    * Download and save your `client_secret.json` in the root directory
    * Install MongoDB: https://www.mongodb.org
    * `npm install && npm start`
