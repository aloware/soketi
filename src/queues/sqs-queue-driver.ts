import async from 'async';
import { Consumer, ConsumerOptions } from 'sqs-consumer';
import { createHash } from 'crypto';
import { Job } from '../job';
import { JobData } from '../webhook-sender';
import { Log } from '../log';
import { QueueInterface } from './queue-interface';
import { Message, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Server } from '../server';
import { v4 as uuidv4 } from 'uuid';

export class SqsQueueDriver implements QueueInterface {
    /**
     * The list of consumers with their instance.
     */
    protected queueWithConsumer: Map<string, Consumer> = new Map();

    /**
     * Initialize the SQS queue driver.
     */
    constructor(protected server: Server) {
        //
    }

    /**
     * Add a new event with data to queue.
     */
    addToQueue(queueName: string, data: JobData): Promise<void> {
        return new Promise(resolve => {
            let message = JSON.stringify(data);

            let params = {
                MessageBody: message,
                MessageDeduplicationId: createHash('sha256').update(message).digest('hex'),
                MessageGroupId: `${data.appId}_${queueName}`,
                QueueUrl: this.server.options.queue.sqs.queueUrl,
            };

            this.sqsClient().send(new SendMessageCommand(params)).then(response => {
                if (this.server.options.debug) {
                    Log.successTitle('✅ SQS client published message to the queue.');
                    Log.success({ response, params, queueName });
                }
            }).catch(err => {
                Log.errorTitle('❎ SQS client could not publish to the queue.');
                Log.error({ err, params, queueName });
            }).then(() => resolve());
        });
    }

    /**
     * Register the code to run when handing the queue.
     */
    processQueue(queueName: string, callback: CallableFunction): Promise<void> {
        return new Promise(resolve => {
            // Returning the message acknowledges it, so it gets deleted from the queue.
            let handleMessage = (message: Message) => {
                return new Promise<Message>(resolve => {
                    callback(
                        new Job(uuidv4(), JSON.parse(message.Body)),
                        () => {
                            if (this.server.options.debug) {
                                Log.successTitle('✅ SQS message processed.');
                                Log.success({ Body: message.Body, queueName });
                            }

                            resolve(message);
                        },
                    );
                });
            };

            let consumerOptions: ConsumerOptions = {
                queueUrl: this.server.options.queue.sqs.queueUrl,
                sqs: this.sqsClient(),
                batchSize: this.server.options.queue.sqs.batchSize,
                pollingWaitTimeMs: this.server.options.queue.sqs.pollingWaitTimeMs,
                // The driver publishes with a group and deduplication id, so the queue is FIFO by design.
                suppressFifoWarning: true,
                ...this.server.options.queue.sqs.consumerOptions,
            };

            if (this.server.options.queue.sqs.processBatch) {
                consumerOptions.handleMessageBatch = (messages) => {
                    return Promise.all(messages.map(message => handleMessage(message)));
                };
            } else {
                consumerOptions.handleMessage = handleMessage;
            }

            let consumer = Consumer.create(consumerOptions);

            consumer.on('error', (err) => {
                Log.errorTitle(`❎ SQS consumer for ${queueName} reported an error.`);
                Log.error(err);
            });

            consumer.on('processing_error', (err) => {
                Log.errorTitle(`❎ SQS consumer for ${queueName} could not process a message.`);
                Log.error(err);
            });

            consumer.start();

            this.queueWithConsumer.set(queueName, consumer);

            resolve();
        });
    }

    /**
     * Clear the queues for a graceful shutdown.
     */
    disconnect(): Promise<void> {
        return async.each([...this.queueWithConsumer], ([queueName, consumer]: [string, Consumer], callback) => {
            if (consumer.status.isRunning) {
                // Abort the in-flight long poll so a stopping instance does not take messages it will never process.
                consumer.stop({ abort: true });
            }

            callback();
        });
    }

    /**
     * Get the SQS client.
     */
    protected sqsClient(): SQSClient {
        let sqsOptions = this.server.options.queue.sqs;

        return new SQSClient({
            region: sqsOptions.region || 'us-east-1',
            endpoint: sqsOptions.endpoint || this.endpointFromQueueUrl(sqsOptions.queueUrl),
            ...sqsOptions.clientOptions,
        });
    }

    /**
     * Derive the endpoint from the queue URL when none is configured.
     */
    protected endpointFromQueueUrl(queueUrl: string): string|undefined {
        try {
            return new URL(queueUrl).origin;
        } catch (e) {
            return undefined;
        }
    }
}
