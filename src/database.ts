//.src/database.ts
import type { LogEntry, TaskRun } from "./types.ts";
import { LogType, Status } from "./types.ts";

export interface TaskData {
    status: Status;
    runs: TaskRun[];
}

export interface DatabaseStorage {
    getTaskData(taskId: string): TaskData | undefined;
    setTaskData(taskId: string, data: TaskData): void;
    getData<T = unknown>(key: string): T | undefined;
    setData(key: string, value: unknown): void;
}

export interface TaskatronDatabase {
    getTaskStatus(taskId: string): Status;
    getAllTaskLogs(taskId: string, options?: { startTime?: number }): TaskRun[];
    getLastTaskLog(taskId: string, options?: { startTime?: number }): TaskRun | undefined;
    updateTaskStatus(
        taskId: string,
        status: Status,
        logMessage?: string,
        logType?: LogType,
    ): void;
    addTaskLog(taskId: string, type: LogType, message: string): void;
    printAllTasks(): void;
    setData(key: string, value: unknown): void;
    getData<T = unknown>(key: string): T | undefined;
}

export abstract class BaseDatabase implements TaskatronDatabase {
    protected abstract storage: DatabaseStorage;

    getTaskStatus(taskId: string): Status {
        const taskData = this.storage.getTaskData(taskId);
        return taskData ? taskData.status : Status.IDLE;
    }

    getAllTaskLogs(taskId: string, options?: { startTime?: number }): TaskRun[] {
        const { startTime } = options || {};
        const taskData = this.storage.getTaskData(taskId);

        if (taskData) {
            let runs = taskData.runs;
            if (startTime) {
                runs = runs.filter((run) => run.startTime >= startTime);
            }
            return runs;
        } else {
            console.warn(`Task ${taskId} not found.`);
            return [];
        }
    }

    getLastTaskLog(taskId: string, options?: { startTime?: number }): TaskRun | undefined {
        const runs = this.getAllTaskLogs(taskId, options);
        return runs[runs.length - 1];
    }

    updateTaskStatus(
        taskId: string,
        status: Status,
        logMessage?: string,
        logType: LogType = LogType.SYSTEM,
    ): void {
        let taskData = this.storage.getTaskData(taskId);
        if (!taskData) {
            taskData = { status: Status.IDLE, runs: [] };
        }

        let currentRun = taskData.runs[taskData.runs.length - 1];

        switch (status) {
            case Status.STARTING:
                currentRun = { id: crypto.randomUUID(), startTime: new Date().getTime(), taskLog: [] };
                taskData.runs.push(currentRun);
                status = Status.RUNNING;
                break;
            case Status.FINISHING:
                if (currentRun) {
                    currentRun.endTime = new Date().getTime();
                }
                status = Status.DONE;
                break;
            case Status.FAILED:
                if (currentRun) {
                    currentRun.endTime = new Date().getTime();
                }
                break;
        }

        if (logMessage && currentRun) {
            const newLog: LogEntry = {
                type: logType,
                timestamp: new Date().getTime(),
                message: logMessage,
            };
            currentRun.taskLog.push(newLog);
        }

        taskData.status = status;
        this.storage.setTaskData(taskId, taskData);
    }

    addTaskLog(taskId: string, type: LogType, message: string): void {
        const taskData = this.storage.getTaskData(taskId);
        if (taskData) {
            const currentRun = taskData.runs[taskData.runs.length - 1];
            if (currentRun) {
                const newLog: LogEntry = {
                    type,
                    timestamp: new Date().getTime(),
                    message,
                };
                currentRun.taskLog.push(newLog);
                this.storage.setTaskData(taskId, taskData);
            } else {
                console.warn(`No active run found for task ${taskId}. Log message will not be added.`);
            }
        } else {
            console.warn(`Task ${taskId} not found. Log message will not be added.`);
        }
    }

    printAllTasks(): void {
        console.log("printAllTasks() - override this method to implement task listing");
    }

    setData(key: string, value: unknown): void {
        this.storage.setData(key, value);
    }

    getData<T = unknown>(key: string): T | undefined {
        return this.storage.getData<T>(key);
    }
}

class InMemoryStorage implements DatabaseStorage {
    private tasks: Map<string, TaskData> = new Map();
    private data: Map<string, unknown> = new Map();

    getTaskData(taskId: string): TaskData | undefined {
        return this.tasks.get(taskId);
    }

    setTaskData(taskId: string, data: TaskData): void {
        this.tasks.set(taskId, data);
    }

    getData<T = unknown>(key: string): T | undefined {
        return this.data.get(key) as T | undefined;
    }

    setData(key: string, value: unknown): void {
        this.data.set(key, value);
    }

    getAllTaskIds(): string[] {
        return Array.from(this.tasks.keys());
    }
}

// In-memory database for dev
export class InMemoryDatabase extends BaseDatabase {
    protected storage: DatabaseStorage;
    private inMemoryStorage: InMemoryStorage;

    constructor() {
        super();
        this.inMemoryStorage = new InMemoryStorage();
        this.storage = this.inMemoryStorage;
    }

    override printAllTasks(): void {
        console.log("Current Database State:");
        const taskIds = this.inMemoryStorage.getAllTaskIds();
        for (const taskId of taskIds) {
            const taskData = this.storage.getTaskData(taskId);
            if (taskData) {
                console.log(`  Task ID: ${taskId}`);
                console.log(`    Status: ${taskData.status}`);
                console.log("    Runs:");
                for (const [index, run] of taskData.runs.entries()) {
                    console.log(`      Run ${index + 1}: ${run.id}`);
                    console.log(`        Start Time: ${new Date(run.startTime).toISOString()}`);
                    if (run.endTime) {
                        console.log(`        End Time: ${new Date(run.endTime).toISOString()}`);
                    }
                    console.log("        Logs:");
                    for (const log of run.taskLog) {
                        console.log(
                            `          - ${new Date(log.timestamp).toISOString()} [${log.type}]: ${log.message}`,
                        );
                    }
                }
            }
        }
    }
}
