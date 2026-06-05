const { pathToRegexp } = require('next/dist/compiled/path-to-regexp');

try {
  const keys1 = [];
  const regexp1 = pathToRegexp('/:path(.+\\.(?:js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot))', keys1);
  console.log('Regexp 1:', regexp1);
  console.log('Matches /favicon.ico:', regexp1.test('/favicon.ico'));
  console.log('Matches /_next/static/chunks/main.js:', regexp1.test('/_next/static/chunks/main.js'));
} catch (e) {
  console.error('Error 1:', e.message);
}

try {
  const keys2 = [];
  const regexp2 = pathToRegexp('/((?!_next/static).*)', keys2);
  console.log('Regexp 2:', regexp2);
  console.log('Matches /login:', regexp2.test('/login'));
  console.log('Matches /_next/static/chunks/main.js:', regexp2.test('/_next/static/chunks/main.js'));
} catch (e) {
  console.error('Error 2:', e.message);
}
