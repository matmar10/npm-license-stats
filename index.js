#!/usr/bin/env node

'use strict';

const crawler = require('npm-license-crawler');
const yargs = require('yargs');


yargs
  .usage('$0 <path..> [path2] [path3] ...')
  .command({
    command: '$0 <path..>',
    desc: 'Paths to scan',
    builder: {
      path: {
        type: 'string',
        description: 'Path to scan and collect statistics about',
        demandOption: true,
        positional: true,
      },
      exclude: {
        type: 'string',
        description: 'Path(s) to exclude from scanning',
        description: 'Path to be excluded'
      },
      dependencies: {
        type: 'boolean',
        description: 'show only third-party licenses, i.e., only list the dependencies defined in package.json.',
        default: true
      },
      indirect: {
        type: 'boolean',
        description: 'includg non-direct dependencies licenses',
        default: false
      },
      color: {
        type: 'boolean',
        description: 'show color in CLI output',
        default: true
      },
      report: {
        type: 'boolean',
        description: 'whether to print a markdown report',
        default: true
      },
      excludeRepo: {
        type: 'string',
        description: '',
        default: []
      }
    },
    handler: argv => {
      const opts = {
        start: argv.path,
        exclude: argv.exclude || [],
        dependencies: argv.dependencies,
        onlyDirectDependencies: !argv.indirect,
        noColor: !argv.color,
      };

      const results = {
        libs: 0,
        licenses: {},
        custom: [],
        unknown: [],
        unlicensed: [],
      };
      if (argv.excludeRepo) {
        argv.excludeRepo = Array.isArray(argv.excludeRepo) ?
          argv.excludeRepo : [argv.excludeRepo];
      } else {
        argv.excludeRepo = [];
      }
      crawler.dumpLicenses(opts, function(error, res) {
        if (error) {
          console.error(error);
          return;
        }
        const pkgs = Object.keys(res);
        pkgs.forEach(packageName => {
          const pkg = res[packageName];
          if (argv.excludeRepo.length && pkg.repository) {
            let match = false;
            argv.excludeRepo.forEach(repo => {
              if (-1 === repo.indexOf(pkg.repository)) {
                return;
              }
              match = true;
            });
            if (match) {
              return;
            }
          }
          results.libs++;
          results.licenses[pkg.licenses] = results.licenses[pkg.licenses] || 0;
          results.licenses[pkg.licenses]++;
          if ('UNKNOWN' === pkg.licenses) {
            if (pkg.licenseUrl) {
              results.custom.push(pkg.licenseUrl);
            } else if (pkg.repository) {
              results.custom.push(pkg.repository);
            } else {
              results.unknown.push(pkg);
            }
          }
          if ('UNLICENSED' === pkg.licenses) {
            results.unlicensed.push(pkg);
          }
        });

        if (argv.report) {
          let licensesSummary = [];
          const names = Object.keys(results.licenses);
          names.forEach(name => licensesSummary.push(`- **${name}**: ${results.licenses[name]}`));
          const report = `
# Results of Scan

**Total Libraries scanned**: ${results.libs}

${licensesSummary.join('\n')}
        `;
          console.log(report);
        }
      });
    },
  })
  .parse();
