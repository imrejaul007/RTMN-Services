"use strict";
/**
 * Hojai Core - Logger Utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(service) {
    return {
        info: (event, data) => {
            console.log(JSON.stringify({ level: 'info', service, event, ...data }));
        },
        error: (event, data) => {
            console.error(JSON.stringify({ level: 'error', service, event, ...data }));
        },
        warn: (event, data) => {
            console.warn(JSON.stringify({ level: 'warn', service, event, ...data }));
        },
        debug: (event, data) => {
            if (process.env.DEBUG === 'true') {
                console.log(JSON.stringify({ level: 'debug', service, event, ...data }));
            }
        }
    };
}
//# sourceMappingURL=logger.js.map