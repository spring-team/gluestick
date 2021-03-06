/* @flow */
import type { MismatchedModules, UpdateDepsPromptResults } from '../../types';

const path = require('path');
const getSingleEntryFromGenerator = require('./getSingleEntryFromGenerator');
const parseConfig = require('gluestick-generators').parseConfig;
const { isValidVersion, promptModulesUpdate } = require('./utils');
const version = require('../../../package.json').version;

type ProjectPackage = {
  dependencies: Object,
  devDependencies: Object,
};

const isFileDependency = (name: string) => {
  return name.startsWith('file');
};

const isMismatched = (project, template) => {
  return (
    !project ||
    (!isValidVersion(project, template) && !isFileDependency(project))
  );
};

/**
 * Open the package.json file in both the project as well as the one used by
 * this command line interface, then compare the versions for shared modules.
 * If the CLI uses a different version than the project we are working in then
 * it will prompt the user to automatically update their project so that it
 * matches the module versions used by the CLI.
 *
 * Now when we update versions in the CLI that the package uses, the projects
 * will automatically get updated too.
 *
 * Also, We include all of the required dependencies when you generate a new
 * project.  Sometimes these dependencies change over time and we need a nice
 * way of updating apps that were generated with previous versions of the CLI.
 * To solve this problem, we look at both the dependencies and development
 * dependencies that would be included in a brand new application. If the
 * project is missing a required dependency, then we prompt the user to update
 * that as well.
 *
 * A Promise is returned so that we can use async/await when calling this
 * method.
 *
 * @return {Promise}
 */
const checkForMismatch = (
  requiredPackage: ProjectPackage,
  dev: boolean,
): Promise<UpdateDepsPromptResults> => {
  // This is done to keep live reference to mock single function in testing
  const projectPackage: ProjectPackage = {
    dependencies: {},
    devDependencies: {},
    ...requiredPackage,
  };
  const pathToPackageGenerator: string = path.join(
    require.resolve('gluestick-generators').split('gluestick-generators')[0],
    'gluestick-generators',
    'build/templates/package',
  );
  const packageGeneratorEntry: Object = getSingleEntryFromGenerator(
    pathToPackageGenerator,
    'package.json',
    { gluestickDependencies: { gluestick: version } },
  );
  const templatePackage: ProjectPackage = JSON.parse(
    // $FlowIgnore template at this point will be a string
    parseConfig(
      {
        entry: packageGeneratorEntry,
      },
      {},
    ).entry.template,
  );
  const mismatchedModules: MismatchedModules = {};
  const markMissing = (dep, type) => {
    mismatchedModules[dep] = {
      required: templatePackage[type][dep],
      project: projectPackage[type][dep] || 'missing',
      type,
    };
  };
  Object.keys(templatePackage.dependencies).forEach((dep: string): void => {
    const project = projectPackage.dependencies[dep];
    const template = templatePackage.dependencies[dep];
    if (dev && dep === 'gluestick' && !/\d+\.\d+\.\d+.*/.test(project)) {
      return;
    }
    if (isMismatched(project, template)) {
      markMissing(dep, 'dependencies');
    }
  });
  Object.keys(templatePackage.devDependencies).forEach((dep: string): void => {
    const project = projectPackage.devDependencies[dep];
    const template = templatePackage.devDependencies[dep];

    if (isMismatched(project, template)) {
      markMissing(dep, 'devDependencies');
    }
  });

  // prompt for updates if we have any, otherwise we are done
  if (Object.keys(mismatchedModules).length > 0) {
    return promptModulesUpdate(mismatchedModules);
  }
  return Promise.resolve({ shouldFix: false, mismatchedModules: {} });
};

module.exports = checkForMismatch;
