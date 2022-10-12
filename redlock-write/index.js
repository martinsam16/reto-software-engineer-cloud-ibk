const redis = require('redis')
const Redlock = require('redlock')
const dotenv = require('dotenv');
const { promisify } = require('util')
dotenv.config();
var Kafka = require("node-rdkafka");

const express = require('express')
const app = express()
app.use(express.json())

// Create and configure a Redis client.
const redisClient = redis.createClient('6379', process.env.REDIS_SERVER_IP)
redisClient.on('error', error => console.error(error))
const redisSet = promisify(redisClient.set).bind(redisClient)
const redisGet = promisify(redisClient.get).bind(redisClient)
const redisDel = promisify(redisClient.del).bind(redisClient)

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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
const topics = [`${prefix}-cache`];
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
        const received = JSON.parse(data.value.toString())
        const key = received.key
        console.log("Event received!!:D")

        const resource = `locks:${key}`
        const ttl = 20000

        redlock.lock(resource, ttl)
            .then(async function (lock) {
                console.log('Locked by KafkaEventConsumer')
                listData = JSON.parse(await redisGet(key)) || []
                listData.push(received.value)

                listDataString = JSON.stringify(listData)


                await redisSet(key, listDataString)
                await sleep(5000)
                console.log('Unlocked by KafkaEventConsumer!')
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

app.get('/getValue/:key', async (req, res) => {
    if (!req.params.key) {
        return res.status(400).json({ error: 'Wrong input.' })
    }

    try {

        const resource = `locks:${req.params.key}`
        const ttl = 20000

        redlock.lock(resource, ttl)
            .then(async function (lock) {
                console.log(`Locked by /getValue/:${req.params.key} endpoint`)
                const value = await redisGet(req.params.key)
                res.json(JSON.parse(value))
                console.log(`Unlocked by /getValue/:${req.params.key} endpoint!`)
                return lock.unlock()
                    .catch(function (err) {
                        console.error(err);
                    })
            })
    } catch (e) {
        res.json(e)
    }
})

app.delete('/deleteKey/:key', async (req, res) => {
    if (!req.params.key) {
        return res.status(400).json({ error: 'Wrong input.' })
    }

    try {


        const resource = `locks:${req.params.key}`
        const ttl = 20000

        redlock.lock(resource, ttl)
            .then(async function (lock) {
                console.log(`Locked by /deleteKey/:${req.params.key} endpoint`)
                const value = await redisDel(req.params.key)
                res.json(value)
                console.log(`Unlocked by /deleteKey/:${req.params.key} endpoint!`)
                return lock.unlock()
                    .catch(function (err) {
                        console.error(err);
                    })
            })

    } catch (e) {
        res.json(e)
    }
})

app.listen(3000, () => {
    console.log('Server is up on port 3000')
})