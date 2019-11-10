import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf } = format;


/*
 * Class to wrap logger
 */
export default class Logger {

  constructor() {
    //formatter for logs
    const myFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    });
    this.winstonLogger = createLogger({
      level: process.env.logLevel || 'info',
      format: combine(
        label({label: 'SlackBot'}),
        timestamp(),
        myFormat
      ),
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'error.log', level: 'error' })
      ]
    });
  }

  log(level, message, ...objects) {
    return this.winstonLogger.log(level, message, ...objects);
  }

  error(message, ...objects) {
    return this.winstonLogger.error(message, ...objects);
  }

  isErrorEnabled() {
    return this.winstonLogger.levels[this.winstonLogger.level] >= this.winstonLogger.levels['error'];
  }

  warn(message, ...objects) {
    return this.winstonLogger.warn(message, ...objects);
  }

  isWarnEnabled() {
    return this.winstonLogger.levels[this.winstonLogger.level] >= this.winstonLogger.levels['warn'];
  }

  info(message, ...objects) {
    return this.winstonLogger.info(message, ...objects);
  }

  isInfoEnabled() {
    return this.winstonLogger.levels[this.winstonLogger.level] >= this.winstonLogger.levels['info'];
  }

  debug(message, ...objects) {
    return this.winstonLogger.debug(message, ...objects);
  }

  isDebugEnabled() {
    return this.winstonLogger.levels[this.winstonLogger.level] >= this.winstonLogger.levels['debug'];
  }

  verbose(message, ...objects) {
    return this.winstonLogger.verbose(message, ...objects);
  }

  isVerboseEnabled() {
    return this.winstonLogger.levels[this.winstonLogger.level] >= this.winstonLogger.levels['verbose'];
  }

  silly(message, ...objects) {
    return this.winstonLogger.silly(message, ...objects);
  }

  isSillyEnabled() {
    return this.winstonLogger.levels[this.winstonLogger.level] >= this.winstonLogger.levels['silly'];
  }
}