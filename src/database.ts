//.src/database.ts
import type { LogEntry, TaskRun } from "./types.ts";
import { LogType, Status } from "./types.ts";

export class Database {
    // in-memory database for dev
    private tasks: Map<string, { status: Status; runs: TaskRun[] }> = new Map();

    constructor() {
    }

    getTaskStatus(taskId: string): Status {
        const taskData = this.tasks.get(taskId);
        return taskData ? taskData.status : Status.IDLE;
    }

    updateTaskStatus(
        taskId: string,
        status: Status,
        logMessage?: string,
        logType: LogType = LogType.SYSTEM,
    ) {
        let taskData = this.tasks.get(taskId);
        if (!taskData) {
            taskData = { status: Status.IDLE, runs: [] };
            this.tasks.set(taskId, taskData);
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
    }

    printAllTasks() {
        console.log("Current Database State:");
        for (const [taskId, taskData] of this.tasks) {
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

    addTaskLog(taskId: string, type: LogType, message: string) {
        const taskData = this.tasks.get(taskId);
        if (taskData) {
            const currentRun = taskData.runs[taskData.runs.length - 1];
            if (currentRun) {
                const newLog: LogEntry = {
                    type,
                    timestamp: new Date().getTime(),
                    message,
                };
                currentRun.taskLog.push(newLog);
            } else {
                console.warn(
                    `No active run found for task ${taskId}. Log message will not be added.`,
                );
            }
        } else {
            console.warn(`Task ${taskId} not found. Log message will not be added.`);
        }
    }
}
