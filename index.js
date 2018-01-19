// imports
const relieve = require('relieve')
const ora = require('ora')
const { ScriptTask } = relieve.tasks
const { QueueWorker } = relieve.workers


const worker = new QueueWorker({ concurrency: 7 })

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
}

for (let i = 0; i < 8; i++) {
  const task = new ScriptTask(`${__dirname}/producer.js`)

  task.on('message', (msg) => {
    try {
    calculate(msg)
  } catch(e) {
    console.log(e)
  }
  })
  worker.add(task)
}

const calculate = ({ kilobytes, write_op, append_op }) => {
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

// Spinner for fun
const spinner = ora({
  color: 'red',
  stream: process.stdout,
  text: 'Starting...'
}).start();

// handle generating the spinner text
const display = () => {
  spinner.text = `Avg. Doc Size: ${(stats.avg_kilobytes).toFixed(2)}kb | Write Ops: ${commaify(stats.write_ops)} [${commaify(stats.write_ops_sec)}/sec] | Append Ops: ${commaify(stats.append_ops)} [${commaify(stats.append_ops_sec)}/sec]`
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
}, 1000)

worker.run()