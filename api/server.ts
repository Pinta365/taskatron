import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { prettyJSON } from "@hono/hono/pretty-json";
import type { Scheduler } from "../src/scheduler.ts";

// API without auth atm.
export const createApiServer = (scheduler: Scheduler) => {
    const app = new Hono({});

    app.get("/", (c) => c.text("Taskatron API"));
    app.use(prettyJSON());
    app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

    const api = new Hono();
    api.use("/tasks/*", cors());

    api.get("/tasks", (c) => {
        const tasks = scheduler.getTasks();
        return c.json({ tasks });
    });

    api.get("/tasks/:id", (c) => {
        const id = c.req.param("id");
        const task = scheduler.getTask(id);
        if (task) {
            return c.json({ task });
        } else {
            return c.notFound();
        }
    });

    api.get("/tasks/:id/logs", (c) => {
        const id = c.req.param("id");
        const startTime = c.req.query("startTime") ? parseInt(c.req.query("startTime") as string) : undefined;

        const logs = scheduler.getAllTaskLogs(id, { startTime });
        return c.json(logs);
    });

    api.get("/tasks/:id/lastlog", (c) => {
        const id = c.req.param("id");

        const log = scheduler.getLastTaskLog(id);
        return c.json(log);
    });

    api.post("/tasks/:id/start", (c) => {
        const id = c.req.param("id");
        try {
            const task = scheduler.getTask(id);
            if (!task) {
                return c.json({ message: `Task with ID "${id}" not found.` }, 404);
            }
            scheduler.startTask(task);
            return c.json({ message: `Task "${id}" started.` });
        } catch (error) {
            console.error(error);
            return c.json(
                {
                    message: `Failed to start task "${id}".`,
                    error: error instanceof Error ? error.message : "Unknown error",
                },
                500,
            );
        }
    });

    api.post("/tasks/:id/stop", (c) => {
        const id = c.req.param("id");
        try {
            scheduler.stopTask(id);
            return c.json({ message: `Task "${id}" stopped.` });
        } catch (error) {
            console.error(error);
            return c.json(
                {
                    message: `Failed to stop task "${id}".`,
                    error: error instanceof Error ? error.message : "Unknown error",
                },
                500,
            );
        }
    });

    app.route("/api", api);
    return app;
};
