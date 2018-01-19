// imports
const couchbase = require('couchbase')
const randomBytes = require('random-bytes')
const { Readable, Writable } = require('stream')
const { getReaderId, counter } = require('./utils')

// connect to the cluster
const cluster = new couchbase.Cluster('couchbase://localhost');
const bucket = cluster.openBucket('testing');

// this the task is in it's own forked process, get the ipc channel to send messages back to the parent
const channel = process.relieve.ipc

// Called when the task is started by the Worker
let producer_process_ids = []
const start = () => {
  // we aren't going to start attempting to read right away, attach an event so we can be told to start
  channel.once('start_reading', (process_ids) => {
    // set the available process ids from the producers
    producer_process_ids = process_ids
    // pipe the streams
    reader.pipe(writer)
  })
}

// setup never ending stream
const reader = new Readable({
  // whenever data is requested
  read(size) {
    this.push(this.iterator++)
  },
  objectMode: true,
});
reader.iterator = 0;

// define stream writer
const writer = new Writable({
  write(chunk, encoding, callback) {
    const chance = Math.random() < 0.0015 // use ~0.15% chance of causing a miss
    // we don't really have to much of a chance of generating matching documents, as we're reliant
    // on the producer processes to get something for us to retrieve so we're going to try our best
    const id = getReaderId(
      producer_process_ids[Math.floor(Math.random() * (producer_process_ids.length - 1))],
      chance
    )
    // try to get the generated id
    bucket.get(id, (err) => {
      if (err) {
        if (err.code === 13) { // not really an error just a miss
          channel.send('message', {
            from: 'reader',
            read_miss: 1,
            read_hit: 0,
          })
          callback()
          return
        }
        // some other error happened
        channel.send('message', {
          from: 'reader',
          read_miss: 0,
          read_hit: 0,
        })
        callback(err)
        return
      }
      channel.send('message', {
        from: 'reader',
        read_miss: 0,
        read_hit: 1,
      })
      callback()
    })
  },
  objectMode: true,
})

// handle errors w/ inremental timeout by incrementing and multiplying
let PAUSE_COUNTER = 0
writer.on('error', (err) => {
  // console.log(`Pausing ${process.pid} for ${PAUSE_COUNTER * 200} milliseconds`)
  setTimeout(() => {
    PAUSE_COUNTER += 1
    reader.pipe(writer); // re-pipe the stream
  }, PAUSE_COUNTER * 200)
})

module.exports = {
  start,
}