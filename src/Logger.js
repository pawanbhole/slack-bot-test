import winston from 'winston';


/*
 * Class to wrap logger
 */
export default class Logger {

  constructor() {
    this.winstonLogger = winston.createLogger({
      level: process.env.level || 'info',
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' })
      ]
    });
  }

  log(level, message, ...objects) {
    return this.winstonLogger.log(level, message, ...objects);
  }

  error(message, ...objects) {
    return this.winstonLogger.error(message, ...objects);
  }

  warn(message, ...objects) {
    return this.winstonLogger.warn(message, ...objects);
  }

  info(message, ...objects) {
    return this.winstonLogger.info(message, ...objects);
  }

  debug(message, ...objects) {
    return this.winstonLogger.debug(message, ...objects);
  }

  verbose(message, ...objects) {
    return this.winstonLogger.verbose(message, ...objects);
  }

  silly(message, ...objects) {
    return this.winstonLogger.silly(message, ...objects);
  }

}