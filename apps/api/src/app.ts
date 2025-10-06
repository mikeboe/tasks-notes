import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import tasksRoutes from "./routes/tasks";
import taskStagesRoutes from "./routes/task-stages";
import tagsRoutes from "./routes/tags";
import searchRoutes from "./routes/search";
import teamsRoutes from "./routes/teams";
import assetsRoutes from "./routes/assets";

export const createApp = () => {
    const app = express();

    // Middleware
    app.use(
        cors({
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
        })
    );
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    app.get("/health", (_, res) => {
        res.json({ success: true, message: "Server is running" });
    });

    app.use((req, _, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
    app.use(morgan("combined"));


    // Routes
    app.use("/auth", authRoutes);
    app.use("/teams", teamsRoutes);
    app.use("/notes", notesRoutes);
    app.use("/tasks", tasksRoutes);
    app.use("/task-stages", taskStagesRoutes);
    app.use("/tags", tagsRoutes);
    app.use("/search", searchRoutes);
    app.use("/assets", assetsRoutes);

    // Health check

    // 404 handler
    app.use((_, res) => {
        res.status(404).json({
            success: false,
            message: "Route not found",
        });
    });

    // Error handler
    app.use(
        (
            err: any,
            _: express.Request,
            res: express.Response,
            __: express.NextFunction
        ) => {
            console.error("Unhandled error:", err);
            res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    );


    return app;
}