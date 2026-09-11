import { App } from '../app';
import { AttributeValue, DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { BaseAppManager } from './base-app-manager';
import { boolean } from 'boolean';
import { Log } from '../log';
import { Server } from '../server';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export class DynamoDbAppManager extends BaseAppManager {
    /**
     * The DynamoDB client.
     */
    protected dynamodb: DynamoDBClient;

    /**
     * Create a new app manager instance.
     */
    constructor(protected server: Server) {
        super();

        this.dynamodb = new DynamoDBClient({
            region: server.options.appManager.dynamodb.region,
            endpoint: server.options.appManager.dynamodb.endpoint || undefined,
        });
    }

    /**
     * Find an app by given ID.
     */
    findById(id: string): Promise<App|null> {
        return this.dynamodb.send(new GetItemCommand({
            TableName: this.server.options.appManager.dynamodb.table,
            Key: {
                AppId: { S: id },
            },
        })).then((response) => {
            let item = response.Item;

            if (!item) {
                if (this.server.options.debug) {
                    Log.error(`App ID not found: ${id}`);
                }

                return null;
            }

            return new App(this.unmarshallItem(item), this.server);
        }).catch(err => {
            if (this.server.options.debug) {
                Log.error('Error loading app config from dynamodb');
                Log.error(err);
            }

            return null;
        });
    }

    /**
     * Find an app by given key.
     */
    findByKey(key: string): Promise<App|null> {
        return this.dynamodb.send(new QueryCommand({
            TableName: this.server.options.appManager.dynamodb.table,
            IndexName: 'AppKeyIndex',
            ScanIndexForward: false,
            Limit: 1,
            KeyConditionExpression: 'AppKey = :app_key',
            ExpressionAttributeValues: {
                ':app_key': { S: key },
            },
        })).then((response) => {
            let item = (response.Items || [])[0] || null;

            if (!item) {
                if (this.server.options.debug) {
                    Log.error(`App key not found: ${key}`);
                }

                return null;
            }

            return new App(this.unmarshallItem(item), this.server);
        }).catch(err => {
            if (this.server.options.debug) {
                Log.error('Error loading app config from dynamodb');
                Log.error(err);
            }

            return null;
        });
    }

    /**
     * Transform the marshalled item to a key-value pair.
     */
    protected unmarshallItem(item: Record<string, AttributeValue>): { [key: string]: any; } {
        let appObject = unmarshall(item);

        // Making sure EnableClientMessages is boolean.
        if (appObject.EnableClientMessages instanceof Uint8Array) {
            appObject.EnableClientMessages = boolean(Buffer.from(appObject.EnableClientMessages).toString());
        }

        // JSON-decoding the Webhooks field.
        if (typeof appObject.Webhooks === 'string') {
            try {
                appObject.Webhooks = JSON.parse(appObject.Webhooks);
            } catch (e) {
                appObject.Webhooks = [];
            }
        }

        return appObject;
    }
}
