import { ILogger } from "types";

/**
 * This class holds all loggers, and passes down all logging calls to them
 */
export default class StackLogger implements ILogger {
    private loggers: Partial<ILogger>[];
  
    constructor(loggers: Partial<ILogger>[]) {
      this.loggers = loggers;
    }
    typewriter_log(header: string, color?: string | undefined, text?: string | undefined, x?: boolean | undefined) {
        this.loggers.forEach(logger => logger.typewriter_log && logger.typewriter_log(header, color, text, x));
    }
    double_check () {
        this.loggers.forEach(logger => logger.double_check && logger.double_check());
    }
    log_operation (operation: string, extra?: string | number | undefined, params?: Object | undefined) {
        this.loggers.forEach(logger => logger.log_operation && logger.log_operation(operation, extra, params));
    }
    is_duplicate_operation (operation: string, extra?: string | number | undefined, params?: Object | undefined) {
        // If any logger is not undefined, we return what they return
        for( let logger of this.loggers ) {
            if( logger.is_duplicate_operation ) {
                return logger.is_duplicate_operation(operation, extra, params);
            }
        }
        return false;
    }
    debug(text: string, extra?: string|number): void {
      this.loggers.forEach(logger => logger.debug && logger.debug(text, extra));
    }
  
    info(message: string): void {
      this.loggers.forEach(logger => logger.info && logger.info(message));
    }
  
    warn(message: string): void {
      this.loggers.forEach(logger => logger.warn && logger.warn(message));
    }
  
    error(text: string, extra?: string|number) {
      this.loggers.forEach(logger => logger.error && logger.error(text, extra));
    }

    start_cycle(index: number, name: string) {
        this.loggers.forEach(logger => logger.start_cycle && logger.start_cycle(index, name));
    }

    log_in_cycle_file(data: string | Record<string, any>, filename: string) {
        this.loggers.forEach(logger => logger.log_in_cycle_file && logger.log_in_cycle_file(data, filename));
    }

    push(logger: Partial<ILogger>) {
        this.loggers.push(logger);
    }

  }
  
