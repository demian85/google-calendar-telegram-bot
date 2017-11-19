'use strict';

const moment = require('moment');

const parsers = new Map();

parsers.set('es', function (input) {
  const regex = /([^,]+?),\s*(?:(hoy|mañana|lun|mar|mie|jue|vie|sab|dom)|(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) (\d+))(?:\s+(\d{1,2})(?::(\d{1,2}))?(?:-(\d{1,2})(?::(\d{1,2}))?)?(?:,\s*(\d+)(d|h|m))?)?/i;
  const match = input.match(regex);
  if (!match) return null;
  const date = moment().locale('es').seconds(0);
  const text = match[1];
  const dayOfWeek = (match[2] || '').toLowerCase();
  const specificMonth = (match[3] || '').toLowerCase();
  const specificDate = match[4] || 1;
  const dayOfWeekMap = new Map([
    ['dom', 0], ['lun', 1], ['mar', 2], ['mie', 3], ['jue', 4], ['vie', 5], ['sab', 6]
  ]);

  // set day of the week
  if (dayOfWeek) {
    if (dayOfWeek === 'mañana') {
      date.add(1, 'days');
    } else {
      let currentDayOfWeek = moment().day();
      let futureDayOfWeek = dayOfWeekMap.get(dayOfWeek);
      let diff = Math.abs(futureDayOfWeek - currentDayOfWeek);
      let diffDays = futureDayOfWeek > currentDayOfWeek ? diff : (7 - diff);
      date.add(diffDays, 'days');
    }
  }

  // set specific date
  if (specificMonth) {
    date.month(specificMonth).date(specificDate);
  }

  // parse time
  const startHours = parseInt(match[5]);
  const startMinutes = parseInt(match[6] || 0);
  date.hours(startHours).minutes(startMinutes);
  const endHours = parseInt(match[7]);
  const endMinutes = parseInt(match[8] || 0);
  const endDate = date.clone();
  if (endHours) {
    endDate.hours(endHours).minutes(endMinutes);
  } else {
    endDate.add(1, 'hours');
  }

  // parse reminder
  const reminderNum = (match[9] || '').toLowerCase();
  const reminderUnit = match[10];
  let reminderMinutes = null;
  if (reminderUnit === 'd') {
    reminderMinutes = 60 * 24 * reminderNum;
  } else if (reminderUnit === 'h') {
    reminderMinutes = 60 * reminderNum;
  } else if (reminderUnit === 'm') {
    reminderMinutes = reminderNum;
  }

  return {
    text: text,
    start: date.format(),
    end: endDate.format(),
    reminder: reminderMinutes
  };
});

class StringParser {
  parse(lang, input) {
    return parsers.get(lang)(input);
  }
}

module.exports = StringParser;
