// imports
const couchbase = require('couchbase')
const randomBytes = require('random-bytes')
const { Readable, Writable } = require('stream')
const { getProducerId, counter } = require('./utils')

// connect to the cluster
const cluster = new couchbase.Cluster('couchbase://localhost');
const bucket = cluster.openBucket('testing');

// this the task is in it's own forked process, get the ipc channel to send messages back to the parent
const channel = process.relieve.ipc

// Called when the task is started by the Worker
const start = () => {
  // attach to an event so the start of the producing can be delayed
  channel.once('start_producing', () => {
    reader.pipe(writer)
  })
}

// define a stream reader
const MIN = 1024
const MAX = 3072

const reader = new Readable({
  // whenever data is requested
  read(size) {
    // generator a random byte string
    const random_size = Math.floor(Math.random() * MAX) + MIN;
    randomBytes(Math.floor(Math.random() * MAX) + MIN)
      .then((result) => {
        this.push(result)
        this.iterator++
        if (this.iterator > 100000) {
          this.push(null)
        }
      })
  },
});
reader.iterator = 0;

// define stream writer
const writer = new Writable({
  write(chunk, encoding, callback) {
    const chance = Math.random() < 0.0025 // use ~0.25% chance of issuing an append
    const id = getProducerId(chance)
    if (chance) {
      bucket.append(id, chunk, (err) => {
        // if there was an error and it's error code 18 which is a missing document, perform an insert
        if (err && err.code === 18) {
          bucket.insert(id, chunk, (ins_err) => {
            channel.send('message', {
              from: 'producer',
              kilobytes: chunk.toString().length / 1024,
              write_op: 1,
              append_op: 0
            })
            callback(ins_err) // notify that the chunk has been processed
          })
        } else {
          channel.send('message', {
            from: 'producer',
            kilobytes: chunk.toString().length / 1024,
            write_op: 0,
            append_op: 1
          })
          callback(err)
        }
      })
    } else {
      bucket.upsert(id, chunk, (err) => {
        channel.send('message', {
          from: 'producer',
          kilobytes: chunk.toString().length / 1024,
          write_op: 1,
          append_op: 0
        })
        callback(err)
      })
    }
  }
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
  start
}