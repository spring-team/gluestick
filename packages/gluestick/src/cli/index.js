const commander = require('commander');
const process = require('process');
const { highlight } = require('./colorScheme');
const cliHelpers = require('./helpers');
const commandApi = require('./commandApi');

const debugServerOption = [
  '-D, --debug-server',
  'debug server side rendering with built-in node inspector',
];
const debugServerPortOption = [
  '-p, --debug-port <n>',
  'port on which to run node inspector',
];
const skipBuildOption = [
  '-P, --skip-build',
  'skip build when running in production mode',
];
const statelessFunctionalOption = [
  '-F, --functional',
  '(generate component) stateless functional component',
];
const logLevelOption = [
  '-L, --log-level <level>',
  'set the logging level',
  /^(error|warn|success|info|debug)$/,
  null,
];
const entrypointsOption = [
  '-E, --entrypoints <entrypoints>',
  'Enter specific entrypoint or a group (same as -A)',
];
const appOption = [
  '-A, --app <appName>',
  'Build and run only specified app or a group (same as -E)',
];
const skipDepCheck = [
  '-S, --skip-dep-check',
  'skip check for congruency between package.json and node_module versions',
];

const safelyExecCommand = commandFn => (...commandArguments) => {
  try {
    commandFn(...commandArguments);
  } catch (error) {
    const logger = commandApi.getLogger();
    logger.fatal(error);
  }
};

commander.version(cliHelpers.getVersion());

commander.option('-l, --light', 'use light color schema for logging', () => {
  process.env.GS_LOG_LIGHT = true;
  return true;
});

commander
  .command('new', '', { noHelp: true })
  .description('run the new project generator')
  .arguments('<appName>')
  .option('-d, --dev <path>', 'path to dev version of gluestick')
  .option('-s, --skip-main', 'gluestick will not generate main app')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/new')(commandApi, commandArguments);
    }),
  );

commander
  .command('generate <container|component|reducer|generator>')
  .description('generate a new entity from given template')
  .arguments('<name>')
  .option(
    '-E --entrypoint <entryPoint>',
    'entry point for generated files (same as -A)',
  )
  .option('-A --app <appName>', 'app in which to generate files (same as -E)')
  .option(...statelessFunctionalOption)
  .option('-O, --gen-options <value>', 'options to pass to the generator')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/generate')(commandApi, commandArguments);
    }),
  );

commander
  .command('destroy <container|component|reducer>')
  .description('destroy a generated container')
  .arguments('<name>')
  .option(
    '-E --entrypoint <entryPoint>',
    'entry point (app) from which entity should be removed (same as -A)',
  )
  .option(
    '-A --app <appName>',
    'app from which entity should be removed (same as -E)',
  )
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/destroy')(commandApi, commandArguments);
    }),
  );

commander
  .command('auto-upgrade')
  .description('perform automatic dependency and gluestick files upgrade')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/autoUpgrade')(commandApi, commandArguments);
    }),
  );

commander
  .command('start')
  .alias('s')
  .description('start everything')
  .option('-T, --run-tests', 'run test hook')
  .option('-C --coverage', 'create test coverage')
  .option(...entrypointsOption)
  .option(...appOption)
  .option(...logLevelOption)
  .option(...debugServerOption)
  .option(...debugServerPortOption)
  .option(...skipBuildOption)
  .option(...skipDepCheck)
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/start')(commandApi, commandArguments);
    }),
  );

commander
  .command('build')
  .description('create production asset build')
  .option('-A, --app <name>', 'app or a group of apps to build')
  .option('-S, --stats', 'create webpack stats file')
  .option('--client', 'gluestick builds only client bundle')
  .option('--server', 'gluestick builds only server bundle')
  .option('-D, --vendor', 'build vendor DLL bundle')
  .option(
    '-B, --skip-if-ok',
    'skip vendor DLL recompilation if the bundle is valid',
  )
  .option('-Z, --static [url]', 'prepare html file for static hosting')
  .option('--no-progress', 'disable progress indicator')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/build')(commandApi, commandArguments);
    }),
  );

commander
  .command('bin')
  .allowUnknownOption(true)
  .description('access dependencies bin directory')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/bin')(commandApi, commandArguments);
    }),
  );

commander
  .command('dockerize')
  .description('create docker image')
  .arguments('<name>')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/dockerize')(commandApi, commandArguments);
    }),
  );

commander
  .command('start-client', null, { noHelp: true })
  .description('start client')
  .option(...logLevelOption)
  .option(...entrypointsOption)
  .option(...appOption)
  .action((...commandArguments) => {
    require('../commands/start-client')(commandApi, commandArguments);
  });

commander
  .command('start-server', null, { noHelp: true })
  .description('start server')
  .option(...logLevelOption)
  .option(...entrypointsOption)
  .option(...appOption)
  .option(...debugServerOption)
  .option(...debugServerPortOption)
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/start-server')(commandApi, commandArguments);
    }),
  );

commander
  .command('test')
  .allowUnknownOption()
  .option('-D, --debug-test', 'debug tests with built-in node inspector')
  .description('start tests')
  .action(
    safelyExecCommand((...commandArguments) => {
      require('../commands/test')(commandApi, commandArguments);
    }),
  );

// This command is used by the global `gluestick-cli` package CLI to append
// the commands listed in this file to its help message.
commander.command('print-help', null, { noHelp: true }).action(() => {
  commander.help(txt => {
    // Remove the first 11 lines because the global `gluestick-cli` package CLI
    // prints similar information. Note: `txt` passed to `.help()` uses '\n' to
    // separate lines.
    // https://github.com/tj/commander.js/blob/d8404f8de45c9ba780606878f4d35d0a45743d32/index.js#L1130
    return txt
      .split('\n')
      .slice(11)
      .map(line => line.replace('Commands:', 'Project commands:'))
      .concat('')
      .join('\n');
  });
});

// This is a catch all command. DO NOT PLACE ANY COMMANDS BELOW THIS
commander.command('*', null, { noHelp: true }).action(cmd => {
  const logger = commandApi.getLogger();
  logger.clear();
  logger.warn(`Command '${highlight(cmd)}' not recognized`);
  commander.help();
});

module.exports = commander;
