//./src/task.ts
import type { Scheduler } from "./scheduler.ts";
import type { TaskResult } from "./types.ts";

export abstract class Task<TParams = Record<string | number | symbol, never>> {
    id: string;
    triggers: Task[] = [];
    params: TParams;

    constructor(id?: string, params?: TParams) {
        this.id = id ?? this.constructor.name;
        this.params = params || {} as TParams;
    }

    setTriggers(triggers: Task[]) {
        this.triggers = triggers;
    }

    abstract execute(scheduler?: Scheduler): Promise<Partial<TaskResult>>;
}
