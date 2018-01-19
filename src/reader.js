// imports
const randomBytes = require('random-bytes')
const { Readable, Writable } = require('stream')
const { getReaderId, counter } = require('./utils')
const db = require('./db')

// this the task is in it's own forked process, get the ipc channel to send messages back to the parent
const channel = process.relieve.ipc

// Called when the task is started by the Worker
let available_producer_process_ids = []
let miss_percent = 0.15

// when the task starts
const start = () => {
  const options = JSON.parse(process.argv[3].replace(/^"|"$|\\/g, ''))
  // create all of the necessary connections
  db.connect(options)
  // we aren't going to start attempting to read right away, attach an event so we can be told to start
  channel.once('start_reading', ({ producer_process_ids, missPercent }) => {
    // set the available process ids from the producers
    available_producer_process_ids = producer_process_ids
    // set the miss percentage
    miss_percent = missPercent
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
    const chance = Math.random() < (miss_percent / 100) // use ~0.10% chance of causing a miss
    // we don't really have to much of a chance of generating matching documents, as we're reliant
    // on the producer processes to get something for us to retrieve so we're going to try our best
    const id = getReaderId(
      available_producer_process_ids[Math.floor(Math.random() * (available_producer_process_ids.length - 1))],
      chance
    )
    // try to get the generated id
    db.getBucket().get(id, (err) => {
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
let pause_counter = 0
writer.on('error', (err) => {
  // console.log(`Pausing ${process.pid} for ${PAUSE_COUNTER * 200} milliseconds`)
  setTimeout(() => {
    pause_counter += 1
    reader.pipe(writer); // re-pipe the stream
  }, pause_counter * 200)
})

module.exports = {
  start,
}
