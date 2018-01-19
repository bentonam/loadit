// imports
const os = require('os')
const uuid = require('uuid/v4')

// get the available network interfaces
const interfaces = os.networkInterfaces()

// gets the ip address of the server
const getIPAddress = () => {
  let ip_address
  for (let int in interfaces) {
    ip_address = interfaces[int].reduce((p, c) => {
      if (c.family === 'IPv4' && !c.internal) {
        p = c.address
      }
      return p
    }, '')
    if (ip_address) {
      break
    }
  }
  return ip_address
}

let generated_id_counter = 0 // holds a counter for the process
const generated_ids = []
const GENERATED_IDS_MAX = 1000 // holds the max_ids
const GENERATED_ID_CHANCE = 0.0025 // ~0.25%
// generates an id
// @use_existing {Boolean} - Whether or not to return an existing id
const getProducerId = (use_existing) => {
  let id;
  if (use_existing && generated_ids.length) {
    // get the id
    id = generated_ids[Math.floor(Math.random() * (generated_ids.length - 1))]
  } else {
    // generates a random # between 0 - 100 for an easy %
    let rand = Math.floor(Math.random() * 100)
    // at this point we're going to use the ip of the server + the process id, and then
    // append either a counter or uuid this way we can at least have some predictable
    // data that we can retrieve in addition to random data.  Use a 70% chance of using a
    // counter or uuid as the last part of the key
    id = `${getIPAddress()}::${process.pid}::${rand <= 70 ? generated_id_counter++ : uuid()}`
  }
  // save the id we generated so it can be used if we need existing documents
  // only if the length of generated_ids is less than MAX_IDS or random() < GENERATED_ID_CHANCE
  // allowing us for a slow rolling generated_ids that can be used for appends
  if (generated_ids.length < GENERATED_IDS_MAX || Math.random() <= GENERATED_ID_CHANCE) {
    generated_ids.push(id)
    // so that we don't get to crazy keep a rolling value
    if (generated_ids.length > GENERATED_IDS_MAX) {
      generated_ids.shift()
    }
  }
  return id;
}

// used to generate an id for the reader.  since we know there is a chance of random uuids that
// we can't recreate we'll stick to counters, because the rest is predictable (somewhat)
// so that we increase the likelihood of a match, we'll use a base counter for our min, that will
// periodically grow as documents get produced
let READER_COUNTER_MAX = 1000
setInterval(() => { // add 1000 to the reader counter every second
  READER_COUNTER_MAX += 100
}, 1000)

const getReaderId = (process_id, miss) => {
  const id = `${getIPAddress()}::${process_id}::${miss ? uuid() : Math.floor(Math.random() * READER_COUNTER_MAX)}`
  return id
}

module.exports = {
  getIPAddress,
  getProducerId,
  getReaderId,
}