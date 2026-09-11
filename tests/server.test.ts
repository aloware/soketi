import { Server } from '../src/server';
import { Utils } from './utils';

jest.retryTimes(parseInt(process.env.RETRY_TIMES || '1'));

describe('server test', () => {
    beforeEach(() => {
        jest.resetModules();

        return Utils.waitForPortsToFreeUp();
    });

    afterEach(() => {
        return Utils.flushServers();
    });

    test('stopping an already stopping server reuses the same shutdown', done => {
        Utils.newServer({}, (server: Server) => {
            let first = server.stop();
            let second = server.stop();

            expect(server.closing).toBe(true);
            expect(second).toBe(first);

            first.then(() => {
                expect(server.stop()).toBe(first);
                done();
            });
        });
    });
});
