'use strict';

var google = require('googleapis');

class GPlug {

  addEvent(data) {
    return new Promise((resolve, reject) => {
      var calendar = google.calendar('v3');
      calendar.events.insert(data, function (err, response) {
        if (err) {
          return reject(new Error('The API returned an error: ' + err));
        }
        resolve(response);
      });
    });
  }

  listEvents(auth) {
    return new Promise((resolve, reject) => {
      var calendar = google.calendar('v3');
      calendar.events.list({
        auth: auth,
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      }, function (err, response) {
        if (err) {
          return reject(new Error('The API returned an error: ' + err));
        }
        var events = response.items;
        if (events.length === 0) {
          resolve('No upcoming events found.');
        } else {
          let out = 'Upcoming 10 events:\n';
          for (var i = 0; i < events.length; i++) {
            let event = events[i];
            let start = event.start.dateTime || event.start.date;
            out += start + ' - ' + event.summary + '\n';
          }
          resolve(out);
        }
      });
    });
  }
}

module.exports = GPlug;
