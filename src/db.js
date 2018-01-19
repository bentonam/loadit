// imports
const couchbase = require('couchbase')

// holds all of the available connections
const connections = []

// retrieves a random connection
const getBucket = () => connections[Math.floor(Math.random() * (connections.length - 1))]

// this really shouldn't be done this way, but we need a way to max the connections
const connect = ({ cluster, bucket, username, password, connectionsPerThread }) => {
  for (let i = 0; i < connectionsPerThread; i++) {
    // connect to the cluster
    const cb_cluster = new couchbase.Cluster(`couchbase://${cluster.replace(/^(couchbase|http|https):\/\//, '')}`);
    let cb_bucket
    if (username) { // cb5 rbac
      cb_cluster.authenticate(username, password)
      cb_bucket = cb_cluster.openBucket(bucket)
    } else if (password) { // pre cb5 sasl
      cb_bucket = cb_cluster.openBucket(bucket, password);
    }
    cb_bucket = cb_cluster.openBucket(bucket) // no password
    connections.push(cb_bucket) // save the connection
  }
}

module.exports = {
  connect,
  getBucket,
}
