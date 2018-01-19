// imports
const randomBytes = require('random-bytes')
const { Readable, Writable } = require('stream')
const { getProducerId, counter } = require('./utils')
const db = require('./db')


let min_document_size = 100
let max_document_size = 1000

// this the task is in it's own forked process, get the ipc channel to send messages back to the parent
const channel = process.relieve.ipc

// Called when the task is started by the Worker
const start = () => {
  const options = JSON.parse(process.argv[3].replace(/^"|"$|\\/g, ''))
  // create all of the necessary connections
  db.connect(options)
  // attach to an event so the start of the producing can be delayed
  channel.once('start_producing', ({ minDocumentSize, maxDocumentSize }) => {
    min_document_size = minDocumentSize
    max_document_size = maxDocumentSize
    reader.pipe(writer)
  })
}

// define a stream reader
const reader = new Readable({
  // whenever data is requested
  read() {
    // generator a random byte string
    const random_size = Math.floor(Math.random() * max_document_size) + min_document_size
    randomBytes(random_size)
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
      db.getBucket().append(id, chunk, (err) => {
        // if there was an error and it's error code 18 which is a missing document, perform an insert
        if (err && err.code === 18) {
          db.getBucket().insert(id, chunk, (ins_err) => {
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
      db.getBucket().upsert(id, chunk, (err) => {
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
