//.src/scheduler.ts
import { InMemoryDatabase, type TaskatronDatabase } from "./database.ts";
import { LogType, Status, type TaskRun } from "./types.ts";
import type { Task } from "./task.ts";
import { Cron } from "@hexagon/croner";

export class Scheduler {
    private tasks: Map<string, Task<unknown>> = new Map();
    private cronTasks: Map<string, Cron> = new Map();
    private database: TaskatronDatabase;

    constructor() {
        this.database = new InMemoryDatabase();
    }

    getTasks(): Task<unknown>[] {
        return Array.from(this.tasks.values());
    }

    getTask(taskId: string): Task<unknown> | undefined {
        return this.tasks.get(taskId);
    }

    registerTask(taskOrTasks: Task<unknown>[] | Task<unknown>) {
        const tasksToAdd = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks];

        for (const task of tasksToAdd) {
            if (this.tasks.has(task.id)) {
                console.error(`Task with ID "${task.id}" already registered. Skipping.`);
            }
            this.tasks.set(task.id, task);
        }
    }

    scheduleTask(task: Task<unknown>, cronSchedule: string) {
        const taskId = task.id;
        if (!this.tasks.has(taskId)) {
            throw new Error(`Task with ID "${taskId}" not found.`);
        }

        if (this.cronTasks.has(taskId)) {
            console.warn(`Task with ID "${taskId}" is already scheduled.`);
            // This needs expanding maybe with options. Overwrite job? stop, delete and reschedule? etc
            return;
        }

        const cronTask = new Cron(cronSchedule, () => {
            this.executeTask(task);
        });
        this.cronTasks.set(taskId, cronTask);
    }

    stopTask(taskId: string) {
        // Only pause the schedule, do not remove it
        const cronTask = this.cronTasks.get(taskId);
        if (cronTask) {
            cronTask.stop();
        } else {
            console.warn(`Task with ID "${taskId}" not found or not scheduled.`);
        }
    }

    resumeTask(taskId: string) {
        // Resume the schedule if it exists
        const cronTask = this.cronTasks.get(taskId);
        if (cronTask) {
            cronTask.resume();
        } else {
            console.warn(`Task with ID "${taskId}" not found or not scheduled.`);
        }
    }

    unscheduleTask(taskId: string) {
        // Stop and remove the schedule entirely
        const cronTask = this.cronTasks.get(taskId);
        if (cronTask) {
            cronTask.stop();
            this.cronTasks.delete(taskId);
        } else {
            console.warn(`Task with ID "${taskId}" not found or not scheduled.`);
        }
    }

    startTask(task: Task<unknown>) {
        const taskId = task.id;
        try {
            if (!this.tasks.has(taskId)) {
                throw new Error(`Task with ID "${taskId}" not found.`);
            }
            this.executeTask(task);
        } catch (error) {
            console.error(`Error starting task ${taskId}:`, error);
        }
    }

    private async executeTask(task: Task<unknown>) {
        const taskId = task.id;
        let taskIsSuccessful = false;

        if (!this.tasks.has(taskId)) {
            throw new Error(`Task with ID "${taskId}" not found.`);
        }
        const startTime = performance.now();
        try {
            this.database.updateTaskStatus(taskId, Status.STARTING, "Task started");
            const result = await task.execute(this);
            const endTime = performance.now();
            const executionTimeInSeconds = (endTime - startTime) / 1000;
            this.database.updateTaskStatus(taskId, Status.FINISHING, `Task finished (Execution time: ${executionTimeInSeconds}s)`);

            const taskResult = { ...result, startTime, endTime };
            console.log(taskResult);
            taskIsSuccessful = true;
        } catch (error) {
            this.database.updateTaskStatus(
                taskId,
                Status.FAILED,
                error instanceof Error ? error.message : "An unknown error occurred",
                LogType.ERROR,
            );
        } finally {
            const endTime = performance.now();
            const executionTimeInSeconds = (endTime - startTime) / 1000;
            console.log(`${task?.id} finished. Execution time: ${executionTimeInSeconds} s`);

            if (taskIsSuccessful && task?.triggers) {
                for (const triggeredTask of task.triggers) {
                    this.startTask(triggeredTask);
                }
            }
        }
    }

    addTaskLog(taskId: string, type: LogType, message: string) {
        return this.database.addTaskLog(taskId, type, message);
    }

    getAllTaskLogs(taskId: string, options?: { startTime?: number }): TaskRun[] {
        return this.database.getAllTaskLogs(taskId, options);
    }

    getLastTaskLog(taskId: string, options?: { startTime?: number }): TaskRun | undefined {
        return this.database.getLastTaskLog(taskId, options);
    }

    printAllTasks() {
        return this.database.printAllTasks();
    }
}
