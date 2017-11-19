'use strict';

global.config = Object.assign(
    require('./config-default'),
    require('./config')
);

const StringParser = require('./lib/StringParser').StringParser;
const parser = new StringParser();

console.log(parser.parse('es', 'peluquero, ene 8'));
console.log(parser.parse('es', 'chupar birra, hoy 18-19'));
console.log(parser.parse('es', 'comilona, abr 15 18:30'));
console.log(parser.parse('es', 'comilona, sep 15 18:30-19:50'));
console.log(parser.parse('es', 'comilona de la gran puta!!!, dic 15 18:30, 1d'));
console.log(parser.parse('es', 'comilona en lo de cesar, abr 15 18:30, 6h'));
console.log(parser.parse('es', 'comilona, vie 15 18:30-19:50'));


