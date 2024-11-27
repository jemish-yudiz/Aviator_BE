const console = require('console');
const path = require('path');

function prepare(color, stack, ...logs) {
  const aLogs = [];

  if (process.env.NODE_ENV !== 'prod') aLogs.push(`\x1b[90m[${stack.relativeFilePath}:${stack.lineNumber}]`);
  // if (process.env.NODE_ENV !== 'prod') aLogs.push(`\x1b[90m[${stack.functionName}][${stack.relativeFilePath}:${stack.lineNumber}]`);

  for (let iter = 0; iter < logs.length; iter += 1) {
    aLogs.push(`${color}`);
    aLogs.push(typeof logs[iter] === 'object' ? JSON.stringify(logs[iter], null, 2) : logs[iter]);
  }
  aLogs.push('\x1b[0m');

  console.log(...aLogs);
}

function getCallerInfo() {
  const stack = new Error().stack.split('\n');
  const callerLine = stack[3]; // The 3rd line is where the logger is called from

  // Extract the function name
  const functionNameMatch = callerLine.match(/at (.*?) \(/);
  const functionName = functionNameMatch ? functionNameMatch[1] : 'anonymous function';

  // Extract the file path and line number
  const pathMatch = functionNameMatch ? callerLine.match(/\(([^)]+)\)/) : callerLine.match(/at (.+?)(?=\:\d+\:\d+)/);
  const absoluteFilePath = pathMatch ? pathMatch[1].split(':')[0] : 'unknown file';
  const lineNumberMatch = callerLine.match(/:(\d+):\d+/);
  const lineNumber = lineNumberMatch ? lineNumberMatch[1] : 'unknown line';

  const relativeFilePath = path.relative(process.cwd(), absoluteFilePath);

  return { relativeFilePath, functionName, lineNumber };
}

const log = {
  black: (...logs) => prepare('\x1b[30m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  red: (...logs) => prepare('\x1b[31m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  green: (...logs) => prepare('\x1b[32m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  yellow: (...logs) => prepare('\x1b[33m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  blue: (...logs) => prepare('\x1b[34m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  magenta: (...logs) => prepare('\x1b[35m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  cyan: (...logs) => prepare('\x1b[36m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  white: (...logs) => prepare('\x1b[37m', process.env.NODE_ENV !== 'prod' && getCallerInfo(), ...logs),
  console: console.log,
  error: console.error,
  warn: console.warn,
  table: console.table,
  info: console.info,
  trace: console.trace,
};

if (process.env.NODE_ENV !== 'prod') log.debug = (...logs) => prepare('\x1b[36m', getCallerInfo(), ...logs);

module.exports = log;

// const console = require('console');

// function prepare(color, ...logs) {
//   const aLogs = [];
//   for (let iter = 0; iter < logs.length; iter += 1) {
//     aLogs.push(`\x1b${color}`);
//     aLogs.push(typeof logs[iter] === 'object' ? JSON.stringify(logs[iter], null, 2) : logs[iter]);
//   }
//   aLogs.push('\x1b[0m');
//   console.log(...aLogs);
// }

// const log = {
//   black: () => {},
//   red: () => {},
//   green: () => {},
//   yellow: () => {},
//   blue: () => {},
//   magenta: () => {},
//   cyan: () => {},
//   white: () => {},
//   console: () => {},
//   error: () => {},
//   warn: () => {},
//   table: () => {},
//   info: () => {},
//   trace: () => {},
// };

// if (process.env.NODE_ENV !== 'prod') log.debug = log;

// log.black = (...logs) => prepare('[30m', ...logs);
// log.red = (...logs) => prepare('[31m', ...logs);
// log.green = (...logs) => prepare('[32m', ...logs);
// log.yellow = (...logs) => prepare('[33m', ...logs);
// log.blue = (...logs) => prepare('[34m', ...logs);
// log.magenta = (...logs) => prepare('[35m', ...logs);
// log.cyan = (...logs) => prepare('[36m', ...logs);
// log.white = (...logs) => prepare('[37m', ...logs);
// log.console = console.log;
// log.error = console.error;
// log.warn = console.warn;
// log.table = console.table;
// log.info = console.info;
// log.trace = console.trace;

// module.exports = log;
