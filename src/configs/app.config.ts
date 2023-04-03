import express from "express";
import http from "http";
import { Middlewares } from "./middleware.config";
import chalk from "chalk";
import mongoose from 'mongoose';

import { PublicRoutes } from './../routes/public.routes';
import { MunicipalAdminRoutes } from './../routes/municipalAdmin.routes';
import { AdminRoutes } from './../routes/admin.routes';
import { UserRoutes } from './../routes/user.routes';
import { Helpers } from "./../common/helpers";


import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { Server } from 'socket.io';


require('dotenv').config();


const serviceAccount = require("../servicekey/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const smtptransporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});


export class AppConfig {
    app: express.Application;
    io: Server;


    constructor(app: express.Application) {
        this.app = app;
        this.app.get("/", function (req: any, res: any) {
            res.send("EMA Node JS")
        });

        const server: http.Server = http.createServer(this.app);
        this.io = new Server(server, {
            allowEIO3: true,
            cors: {
                origin: true,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.app.locals.io = this.io;


        this.RegisterMiddlewares();
        this.RegisterRoutes();
        this.ErrorHandling();
        this.StartServer(server);
        this.initiateSingletons();
        this.SetChalk();
    }

    RegisterRoutes() {
        new PublicRoutes(this.app);
        new UserRoutes(this.app);
        new AdminRoutes(this.app);
        new MunicipalAdminRoutes(this.app);
    }

    SecureApiRoutes(middlewares: Middlewares) {
        this.app.use("/api/admin", middlewares.AdminMiddleware);
        this.app.use("/api/municipal-admin", middlewares.MunicipalAdminMiddleware);
        this.app.use("/api/user", middlewares.AuthMiddleware);

    }


    RegisterMiddlewares() {
        const middlewares = new Middlewares(this.app);
        middlewares.RegisterAppMiddlewares();
        this.SecureApiRoutes(middlewares);
    }

    StartServer(server: http.Server) {
        const port: Number = 3001;
        const URL: any = process.env.MONGO_DB_HOST;



        var options: any = {
            dbName: process.env.MONGO_DB_NAME,
            user: process.env.MONGO_DB_USERNAME,
            pass: process.env.MONGO_DB_PASSWORD,
        }

        mongoose.connect(URL, options)

        this.io.on("connection", (socket: any) => {
            console.log("Connected: " + socket);

            socket.on("disconnect", () => {
                console.log("Disconnected: " + socket.userId);
            });

            socket.on("joinSOSChannel", async ({ channelId }: any) => {
                await socket.join(channelId);
                console.log("A user joined private channel");
            }
            );

            socket.on("leaveSOSChannel", async ({ channelId }: any) => {
                socket.leave(channelId);
                console.log("A user left private channel");

            })
        });

        server.listen(port, () => { console.log('Server Started EMA') },);
    }

    initiateSingletons() {
        new Helpers(this.app);
    }

    ErrorHandling() {
        this.app.use(function (req, res, next) {
            res.status(404);

            // respond with html page
            if (req.accepts("html")) {
                res.render("404", { url: req.url });
                return;
            }

            // respond with json
            if (req.accepts("json")) {
                res.Error("Page not found", null, 404);
                return;
            }

            // default to plain-text. send()
            res.type("txt").send("Not found");
        });
    }

    SetChalk() {
        (global as any).log = {
            error: (obj: any) => {
                obj = obj instanceof Object ? JSON.stringify(obj) : obj;
                console.log(
                    chalk.red.bold("============= ERROR =============")
                );
                console.log(chalk.red(obj));
            },
            info: (obj: any) => {
                obj = obj instanceof Object ? JSON.stringify(obj) : obj;
                console.log(
                    chalk.blue.bold("============= INFO =============")
                );
                console.log(chalk.blue(obj));
            },
            success: (obj: any) => {
                obj = obj instanceof Object ? JSON.stringify(obj) : obj;
                console.log(
                    chalk.green.bold("============= SUCCESS =============")
                );
                console.log(chalk.green(obj));
            },
        };
    }
}
