import { WebSocket as uWebSocket } from 'uWebSockets.js';

/**
 * A connection with the state Soketi attaches to it (`app`, `id`, `presence`, ...).
 */
export type WebSocket = uWebSocket<any> & { [key: string]: any };
