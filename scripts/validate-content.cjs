'use strict';
const fs=require('node:fs');
const path=require('node:path');
const validate=require('../tools/content-schema.js');
const data=process.argv[2]?JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8')):require('../CyberWorld/ascension-data.js');
const errors=validate(data);
if(errors.length){errors.forEach(error=>console.error(error));process.exitCode=1;}
else console.log('Content schema passed: '+data.missions.length+' authored missions. Playtesting and independent review remain required.');
