// imports
const commander = require('commander')
const loadit = require('./index').default

// setup cli options
commander
    .version('0.1.0')
    .description('This will perform a load test against a Couchbase cluster, use at you\'re own risk! All options are defaulted. Customize however you\'d like')
    .option(
      '--cluster <s>',
      `The cluster address`,
      'localhost'
    )
    .option(
      '--bucket <s>',
      `The bucket to use`,
      'default'
    )
    .option(
      '--username <s>',
      `The RBAC username to use (only needed for Couchbase Server 5+)`
    )
    .option(
      '--password <s>',
      `The bucket or RBAC password if applicable`
    )
    .option(
      '--connections-per-thread <n>',
      `The # of connections each thread should make to the cluster`,
      (val) => parseInt(val),
      1
    )
    .option(
      '--reader-percent <n>',
      `Percentage 0 - 100 of Reader threads to CPU Cores (0 - 100)`,
      (val) => parseFloat(val),
      75
    )
    .option(
      '--reader-threads <n>',
      `Explict number of Reader threads to use`,
      (val) => parseInt(val)
    )
    .option(
      '--producer-percent <n>',
      `Percentage 0 - 100 of Producer threads to CPU Cores (0 - 100)`,
      (val) => parseFloat(val),
      25
    )
    .option(
      '--producer-threads <n>',
      `Explict number of Producer threads to use`,
      (val) => parseInt(val)
    )
    .option(
      '--reader-threshold <n>',
      `The number of documents to read before stopping the test`,
      (val) => parseInt(val)
    )
    .option(
      '--producer-threshold <n>',
      `The number of documents to produce before stopping the test`,
      (val) => parseInt(val)
    )
    .option(
      '--duration <n>',
      `The number of seconds to run the test for before stopping (default: forever)`,
      (val) => parseInt(val)
    )
    .option(
      '--min-document-size <n>',
      `The minimum size in bytes for documents`,
      (val) => parseInt(val),
      100
    )
    .option(
      '--max-document-size <n>',
      `The maximum size in bytes for documents`,
      (val) => parseInt(val),
      1000
    )
    .option(
      '--writer-delay <n>',
      `The number of seconds to delay before write operations start`,
      (val) => parseInt(val),
      1
    )
    .option(
      '--reader-delay <n>',
      `The number of seconds to delay before read operations start`,
      (val) => parseInt(val),
      2
    )
    .option(
      '--connections-per-thread <n>',
      `The number of connnections each thread should use`,
      (val) => parseInt(val),
      1
    )
    .option(
      '--miss-percent <n>',
      `Percentage of a random miss happening (0.0 - 100)`,
      (val) => parseFloat(val),
      0.10
    )
    .option(
      '--append-percent <n>',
      `Percentage of a random append instead of upsert (0.0 - 100)`,
      (val) => parseFloat(val),
      0.25
    )
    .option(
      '--producer-high-water-mark <n>',
      `The high water mark for the producer in KB`,
      (val) => parseFloat(val),
      16
    )
    .option(
      '--reader-high-water-mark <n>',
      `The high water mark for the reader in KB`,
      (val) => parseFloat(val),
      16
    )
    .parse(process.argv)

exports.default = () => {
  loadit(commander)
}