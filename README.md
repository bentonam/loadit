# LoadIt

This is a NodeJS cli loading testing tool for Couchbase. Use at your own risk, I assume no responsibility for how it's used! This is very basic tool that forks load across multiple child processes


## Usage

```bash
loadit --help                                                                            (master)

  Usage: loadit [options]

  This will perform a load test against a Couchbase cluster, use at you're own risk! All options are defaulted. Customize however you'd like


  Options:

    -V, --version                   output the version number
    --cluster <s>                   The cluster address (default: localhost)
    --bucket <s>                    The bucket to use (default: default)
    --username <s>                  The RBAC username to use (only needed for Couchbase Server 5+)
    --password <s>                  The bucket or RBAC password if applicable
    --connections-per-thread <n>    The # of connections each thread should make to the cluster (default: 1)
    --reader-percent <n>            Percentage 0 - 100 of Reader threads to CPU Cores (0 - 100) (default: 75)
    --reader-threads <n>            Explict number of Reader threads to use
    --producer-percent <n>          Percentage 0 - 100 of Producer threads to CPU Cores (0 - 100) (default: 25)
    --producer-threads <n>          Explict number of Producer threads to use
    --reader-threshold <n>          The number of documents to read before stopping the test
    --producer-threshold <n>        The number of documents to produce before stopping the test
    --duration <n>                  The number of seconds to run the test for before stopping (default: forever)
    --min-document-size <n>         The minimum size in bytes for documents (default: 100)
    --max-document-size <n>         The maximum size in bytes for documents (default: 1000)
    --writer-delay <n>              The number of seconds to delay before write operations start (default: 1)
    --reader-delay <n>              The number of seconds to delay before read operations start (default: 2)
    --connections-per-thread <n>    The number of connnections each thread should use (default: 1)
    --miss-percent <n>              Percentage of a random miss happening (0.0 - 100) (default: 0.1)
    --append-percent <n>            Percentage of a random append instead of upsert (0.0 - 100) (default: 0.25)
    --producer-high-water-mark <n>  The high water mark for the producer in KB (default: 16)
    --reader-high-water-mark <n>    The high water mark for the reader in KB (default: 16)
    -h, --help                      output usage information
```

Example:

```bash
loadit --cluster localhost \
    --bucket testing \
    --connections-per-thread 3 \
    --reader-threads 6 \
    --producer-threads 2 \
    --duration 600 \
    --min-document-size 500 \
    --max-document-size 3072 \
    --reader-delay 5 \
    --reader-high-water-mark 32 \
    --producer-high-water-mark 32
```

### Setup

Requires node, if you don't have node installed, install `nvm` now.

```bash
curl https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
```

Reinitialize the shell

```bash
. ~/.bashrc
```

Install Node 9

```bash
nvm install 9
```

Optionally, make it the default

```bash
nvm alias default 9
```

### Installation

Clone the repository

```bash
git clone https://github.com/bentonam/loadit.git
```

Change to the project directory

```bash
cd loadit
```

Install dependencies

```bash
npm install
```

Link globally

```bash
npm link
```
