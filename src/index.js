// imports
const relieve = require('relieve')
const ora = require('ora')
const { ScriptTask } = relieve.tasks
const { QueueWorker } = relieve.workers
const { cpus } = require('os')

const AVAILABLE_CPUS = cpus().length

// helper to properly display large #
const commaify = (value) => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

exports.default = function loadit({
  cluster,
  bucket,
  username,
  password,
  readerPercent,
  readerThreads,
  producerPercent,
  producerThreads,
  readerThreshold,
  producerThreshold,
  duration,
  minDocumentSize,
  maxDocumentSize,
  writerDelay,
  readerDelay,
  connectionsPerThread,
  missPercent,
  appendPercent
}) {
  const calculated_reader_threads = readerThreads || Math.ceil(AVAILABLE_CPUS * (readerPercent / 100))
  const calculated_producer_threads = producerThreads || Math.ceil(AVAILABLE_CPUS * (producerPercent / 100))
  const total_threads = calculated_reader_threads + calculated_producer_threads
  process.stdout.write('\n******************************************************************************************************************************\n')
  process.stdout.write('*                                              == LoadIt Test ==                                                             *\n')
  process.stdout.write('******************************************************************************************************************************\n')
  process.stdout.write(`Processes: ${total_threads} | Reader: ${calculated_reader_threads} | Writer: ${calculated_producer_threads}\n`)
  process.stdout.write(`Minimum Document Size: ${commaify(minDocumentSize)} bytes | Maximum Document Size: ${commaify(maxDocumentSize)} bytes\n`)
  const worker = new QueueWorker({ concurrency: total_threads })

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
  for (let i = 0; i < calculated_producer_threads; i++) {
    const task = new ScriptTask(`${__dirname}/producer.js`)
    task.name = `producer-${i}`
    task.arguments = [JSON.stringify({cluster, bucket, username, password, connectionsPerThread })]
    task.on('message', (msg) => {
      updateProducerStats(msg)
      // if we're supposed to stop after a certain number of writes
      if (producerThreshold && stats.write_ops >= producerThreshold) {
        worker.kill()
        spinner.succeed()
        process.exit(0)
      }
    })
    // add the producer task to the worker
    worker.add(task)
  }

  // create the reader threads
  for (let i = 0; i < calculated_reader_threads; i++) {
    const task = new ScriptTask(`${__dirname}/reader.js`)
    task.name = `reader-${i}`
    task.arguments = [JSON.stringify({cluster, bucket, username, password, connectionsPerThread })]
    task.on('message', (msg) => {
      updateReaderStats(msg)
      // if we're supposed to stop after a certain number of writes
      if (readerThreshold && stats.read_ops >= readerThreshold) {
        worker.kill()
        spinner.succeed()
        process.exit(0)
      }
    })
    worker.add(task)
  }

  // start the worker
  worker.run()

  // if the test should only last a specified duration, set a timeout
  if (duration) {
    setTimeout(() => {
      worker.kill()
      spinner.succeed()
      process.exit(0)
    }, duration * 1000)
  }

  // start the producers after a delay
  setTimeout(() => {
    worker.send('start_producing', {
      minDocumentSize,
      maxDocumentSize,
      producerThreshold,
      appendPercent,
    })
  }, writerDelay * 1000)

  // start the readers after a delay
  setTimeout(() => {
    // get all of the available producer process ids so we can use those to retrieve documents
    const producer_process_ids = []
    for (let i = 0; i < calculated_producer_threads; i++) {
      producer_process_ids.push(worker.task(`producer-${i}`)._fork.pid)
    }
    worker.send('start_reading', {
      producer_process_ids,
      missPercent,
      readerThreshold,
    })
  }, readerDelay * 1000)

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
    let msg = `Avg. Size: ${(stats.avg_kilobytes).toFixed(2)}kb | `
    msg += `Writes: ${commaify(stats.write_ops)} [${commaify(stats.write_ops_sec)}/sec] | `
    msg += `Appends: ${commaify(stats.append_ops)} [${commaify(stats.append_ops_sec)}/sec] | `
    msg += `Reads: ${commaify(stats.read_ops)} [${commaify(stats.read_ops_sec)}/sec] | `
    msg += `Hits: ${commaify(stats.read_hits)} | `
    msg += `Misses: ${commaify(stats.read_misses)}`
    spinner.text = msg;
  }

  setInterval(() => {
    // clear the per second counters every second
    stats.write_ops_sec = stats.write_ops - stats.write_ops_sec_previous
    stats.write_ops_sec_previous = stats.write_ops
    stats.append_ops_sec = stats.append_ops - stats.append_ops_sec_previous
    stats.append_ops_sec_previous = stats.append_ops
    stats.read_ops_sec = stats.read_ops - stats.read_ops_sec_previous
    stats.read_ops_sec_previous = stats.read_ops
  }, 1000)

}
