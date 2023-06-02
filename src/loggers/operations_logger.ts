import { ILogger } from "types";

/**
 * This class is responsible for tracking operations and avoiding duplicate operations
 */
export class OperationsLogger implements Partial<ILogger> {
    private operations_log = new Set<string>();

    double_check ()  {}
    log_operation (operation: string, extra?: string|number, params?: Object)  {
        const log_operation = (`${operation} ${extra} ` + (params ? JSON.stringify(params): '')).trim();
        this.operations_log.add(log_operation);
        // TODO: log to file_logger.txt, when we have a file logger
    }
    is_duplicate_operation (operation: string, extra?: string|number, params?: Object) {
        const log_operation = (`${operation} ${extra} ` + (params ? JSON.stringify(params): '')).trim();
        return this.operations_log.has(log_operation);
    }
}

