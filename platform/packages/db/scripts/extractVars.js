const vars = require('dotenv-expand').expand(require('dotenv').config({path: '.env'})); 

console.log(Object.entries(vars.parsed).map(([key, value]) => `${key}=${value}`).join('\n'));