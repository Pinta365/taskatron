//.src/types.ts
export enum Status {
    IDLE = "idle",
    STARTING = "starting",
    RUNNING = "running",
    FINISHING = "finishing",
    DONE = "done",
    FAILED = "failed",
    UNKNOWN = "unknown",
}
export enum LogType {
    SYSTEM = "system",
    INFO = "info",
    WARNING = "warning",
    DEBUG = "debug",
    ERROR = "error",
}
export interface LogEntry {
    type: LogType;
    timestamp: number;
    message: string;
}

export interface TaskRun {
    id: string;
    startTime: number;
    endTime?: number;
    taskLog: LogEntry[];
}

export interface TaskEntry {
    status: Status;
    runs?: TaskRun;
}

export interface TaskResult {
    message: string;
    startTime: number;
    endTime: number;
    [key: string]: unknown;
}
