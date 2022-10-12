const redis = require('redis')
const Redlock = require('redlock')
const { promisify } = require('util')

const express = require('express')
const app = express()
app.use(express.json())

// Create and configure a Redis client.
const redisClient = redis.createClient('6379', process.env.REDIS_SERVER_IP)
redisClient.on('error', error => console.error(error))

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

app.listen(3001, () => {
    console.log('Server is up on port 3000')
})