import { EventEmitter } from 'events';

// Create a single shared event emitter instance for the application
const appEvents = new EventEmitter();

// Optional: Increase max listeners if you expect many concurrent users
appEvents.setMaxListeners(100);

export default appEvents;
