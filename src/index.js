// imports
const relieve = require('relieve')
const ora = require('ora')
const { ScriptTask } = relieve.tasks
const { QueueWorker } = relieve.workers
const { cpus } = require('os')

const AVAILABLE_CPUS = cpus().length
const READER_PERCENT = 75 / 100
const READER_THREADS = Math.ceil(AVAILABLE_CPUS * READER_PERCENT)
const PRODUCER_PERCENT = 25 / 100
const PRODUCER_THREADS = Math.floor(AVAILABLE_CPUS * PRODUCER_PERCENT)

const worker = new QueueWorker({ concurrency: READER_THREADS + PRODUCER_THREADS })

// handle output of avg bytes
const stats = {
  kilobytes: [],
  avg_kilobytes: 0,
  write_ops: 0,
  write_ops_sec: 0,
  write_ops_sec_previous: 0,
  append_ops: 0,
  append_ops_sec: 0,
  append_ops_sec_previous: 0,
  read_ops: 0,
  read_ops_sec: 0,
  read_ops_sec_previous: 0,
  read_misses: 0,
  read_hits: 0,
}

// create the producer threads
for (let i = 0; i < PRODUCER_THREADS; i++) {
  const task = new ScriptTask(`${__dirname}/producer.js`)
  task.name = `producer-${i}`
  task.on('message', (msg) => {
    updateProducerStats(msg)
  })
  // add the producer task to the worker
  worker.add(task)
}

// create the reader threads
for (let i = 0; i < READER_THREADS; i++) {
  const task = new ScriptTask(`${__dirname}/reader.js`)
  task.name = `reader-${i}`
  task.on('message', (msg) => {
    updateReaderStats(msg)
  })
  worker.add(task)
}
worker.run()

setTimeout(() => {
  worker.send('start_producing')
}, 100)

setTimeout(() => {
  const producer_process_ids = []
  for (let i = 0; i < PRODUCER_THREADS; i++) {
    producer_process_ids.push(worker.task(`producer-${i}`)._fork.pid)
  }
  worker.send('start_reading', producer_process_ids)
}, 4000)

// handles updating the producer stats
const updateProducerStats = ({ kilobytes, write_op, append_op }) => {
  // only keep 1000 entries for kb avg
  stats.kilobytes.push(kilobytes)
  if (stats.kilobytes.length > 1000) {
    stats.kilobytes.shift()
  }
  stats.avg_kilobytes = stats.kilobytes.reduce((p, c) => c += p) / stats.kilobytes.length
  stats.write_ops += write_op
  stats.append_ops += append_op
  display()
}

// handles updating the reader stats
const updateReaderStats = ({ read_hit, read_miss }) => {
  stats.read_ops += 1
  stats.read_hits += read_hit
  stats.read_misses += read_miss
  display()
}

// Spinner for fun
const spinner = ora({
  color: 'red',
  stream: process.stdout,
  text: 'Starting...'
}).start();

// handle generating the spinner text
const display = () => {
  let msg = `Avg. Doc Size: ${(stats.avg_kilobytes).toFixed(2)}kb | `
  msg += `Writes: ${commaify(stats.write_ops)} [${commaify(stats.write_ops_sec)}/sec] | `
  msg += `Appends: ${commaify(stats.append_ops)} [${commaify(stats.append_ops_sec)}/sec] | `
  msg += `Reads: ${commaify(stats.read_ops)} [${commaify(stats.read_ops_sec)}/sec] | `
  msg += `Hits: ${commaify(stats.read_hits)} | `
  msg += `Misses: ${commaify(stats.read_misses)}`
  spinner.text = msg;
}

// helper to properly display large #
const commaify = (value) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

setInterval(() => {
  // clear the per second counters every second
  stats.write_ops_sec = stats.write_ops - stats.write_ops_sec_previous
  stats.write_ops_sec_previous = stats.write_ops
  stats.append_ops_sec = stats.append_ops - stats.append_ops_sec_previous
  stats.append_ops_sec_previous = stats.append_ops
  stats.read_ops_sec = stats.read_ops - stats.read_ops_sec_previous
  stats.read_ops_sec_previous = stats.read_ops
}, 1000)

// pause for GET_DELAY seconds to ensure all of the workers have started
const GET_DELAY = 1000
setTimeout(() => {
  // startReader()
}, GET_DELAY)
