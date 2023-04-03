import express, { NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import * as bodyparser from 'body-parser';
import * as winston from 'winston';
import * as expressWinston from 'express-winston';
import AuthToken from '../models/authToken';

export class Middlewares {
    app: express.Application;

    constructor(app: express.Application) {
        this.app = app;
    }

    RegisterAppMiddlewares() {
        this.app.use(this.ResponseMiddleware);
        // here we are adding middleware to parse all incoming requests as JSON 
        this.app.use(bodyparser.json({ limit: '10mb' }));
        this.app.use(bodyparser.urlencoded({ extended: false }));

        // here we are adding middleware to allow cross-origin requests
        this.app.use(cors({
            "origin": "*",
            "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
            "preflightContinue": true,
            "optionsSuccessStatus": 204
        }));
        // this.app.options('*', cors())
        // here we are configuring the expressWinston logging middleware,
        // which will automatically log all HTTP requests handled by Express.js
        this.app.use(expressWinston.logger({
            transports: [
                new winston.transports.Console()
            ],
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.json()
            )
        }));

        // here we are configuring the expressWinston error-logging middleware,
        // which doesn't *handle* errors per se, but does *log* them
        this.app.use(expressWinston.errorLogger({
            transports: [
                new winston.transports.Console()
            ],
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.json()
            )
        }));
    }

    AuthMiddleware(req: express.Request, res: express.Response, next: any) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) {
            return res.Error('You are not Authorized. Token missing');
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err: any, d: any) => {
            if (err) {
                return res.Error('You are not Authorized');
            }
            req.auth = d;


            if (d.userType == 'municipal-admin' || d.userType == 'user') {
                next();
            } else {
                return res.Error('You are not Authorized')
            }
        });
    }

    AdminMiddleware(req: express.Request, res: express.Response, next: any) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) {
            return res.Error('You are not Authorized. Token missing');
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err: any, d: any) => {
            if (err) {
                return res.Error('You are not Authorized');
            }
            req.auth = d;

            if (d.userType == 'admin') {
                next();
            } else {
                return res.Error('You are not Authorized as Admin')
            }

        });
    }

    MunicipalAdminMiddleware(req: express.Request, res: express.Response, next: any) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token == null) {
            return res.Error('You are not Authorized. Token missing');
        }
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, async (err: any, d: any) => {
            if (err) {
                return res.Error('You are not Authorized');
            }
            req.auth = d;
            let authToken = await AuthToken.findOne({ user: d._id })
            if (authToken != null && d.userType == 'municipal-admin' && authToken.token == token) {
                next();
            }
            else {
                return res.Error('You are not not Authorized as Muncipal Admin', null, 401)
            }
        });
    }

    ResponseMiddleware(req: express.Request, res: express.Response, next: any) {
        res.Success = (message: string, data?: any, respCode?: number) => {
            respCode = respCode ? respCode : 200
            res.status(respCode)
                .json({
                    success: true,
                    message,
                    data
                })
        };

        res.Error = (message: string, data?: any, respCode?: number) => {
            respCode = respCode ? respCode : 200
            res.status(respCode)
                .json({
                    success: false,
                    message,
                    data
                })
        };

        next();
    }
}