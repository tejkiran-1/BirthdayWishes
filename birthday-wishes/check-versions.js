const fs = require('fs');
const path = require('path');
const nmDir = '/Users/kushwte/Documents/Learning/Angular/BirthdayWishes/birthday-wishes/node_modules';

function check(dir, prefix) {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const pkgJson = path.join(fullPath, 'package.json');
      try {
        const p = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
        const ver = p.version;
        if (ver === undefined || ver === null || ver === '') {
          console.log('INVALID VERSION:', prefix + item, '=> version:', JSON.stringify(ver));
        }
      } catch(e) {
        if (item.startsWith('@')) {
          check(fullPath, prefix + item + '/');
        }
      }
    });
  } catch(e) {}
}
check(nmDir, '');
console.log('DONE checking node_modules');
