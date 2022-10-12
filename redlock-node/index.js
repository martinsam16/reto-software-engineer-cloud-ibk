const redis = require('redis')
const Redlock = require('redlock')
const { promisify } = require('util')
const dotenv = require('dotenv');
dotenv.config();
var Kafka = require("node-rdkafka");

// Create and configure a Redis client.
const redisClient = redis.createClient('6379', process.env.REDIS_SERVER_IP)
redisClient.on('error', error => console.error(error))
const redisSet = promisify(redisClient.set).bind(redisClient)

const redlock = new Redlock(
    [redisClient],
    {
        driftFactor: 0.01,
        retryCount: -1,
        retryDelay: 200,
        retryJitter: 200
    }
)

redlock.on('clientError', function (err) {
    console.error('A redis error has occurred:', err);
});

// Create and configure a Kafka client.

var kafkaConf = {
    "group.id": "cloudkarafka-redlock",
    "metadata.broker.list": process.env.CLOUDKARAFKA_BROKERS.split(","),
    "socket.keepalive.enable": true,
    "security.protocol": "SASL_SSL",
    "sasl.mechanisms": "SCRAM-SHA-256",
    "sasl.username": process.env.CLOUDKARAFKA_USERNAME,
    "sasl.password": process.env.CLOUDKARAFKA_PASSWORD,
    "debug": "generic,broker,security"
};

const prefix = process.env.CLOUDKARAFKA_USERNAME;
const topics = [`${prefix}-ibk`];
const consumer = new Kafka.KafkaConsumer(kafkaConf, {
    "auto.offset.reset": "beginning"
});


consumer
    .on("error", function (err) {
        console.error(err);
    })
    .on("ready", function (arg) {
        console.log(`Consumer ${arg.name} ready`);
        consumer.subscribe(topics);
        consumer.consume();
    })
    .on("data", function (data) {
        consumer.commit(data);
        const received = data.value.toString()
        console.log("received: "+ received)

        const resource = `locks:${received}`
        const ttl = 20000

        const key = received
        const value = received
        
        
        redlock.lock(resource, ttl)
            .then(async function (lock) {
                console.log('Lock acquired!')
                await redisSet(key, value)
                console.log(`SET key=${key} value=${value}`)
                console.log('Key unlocked!')
                return lock.unlock()
                    .catch(function (err) {
                        console.error(err);
                    })
            })
    })
    .on("disconnected", function (arg) {
        console.error("Disconnected from kafka server")
    })
    .on('event.error', function (err) {
        console.error(err);
    })
    .on('event.log', function (log) {
        console.log(log);
    });

consumer.connect();