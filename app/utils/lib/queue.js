const redis = require('./redis');

class Queue {
    initialize() {
        this.client = redis.client;
        this.queues = {};
    }

    async addJob(sQueueName, oData) {
        const nTask = await this.client.lPush(`${sQueueName}:pending`, _.stringify(oData));
        const aKey = await this.client.keys(`${sQueueName}:active`);
        if (parseInt(nTask) === 1 && !this.queues[sQueueName] && !aKey.length) await this.processQueue(sQueueName);
    }

    async processQueue(sQueueName) {
        const oPending = await this.client.rPop(`${sQueueName}:pending`);
        if (oPending) {
            this.queues[sQueueName] = true;
            await this.client.lPush(`${sQueueName}:active`, oPending);
            this.processJob(sQueueName, _.parse(oPending));
        }
    }

    async processJob(sQueueName, oData) {
        await emitter.asyncEmit('custom', oData);
        await this.client.rPop(`${sQueueName}:active`);
        delete this.queues[sQueueName];
        await this.processQueue(sQueueName);
    }
}

module.exports = new Queue();
