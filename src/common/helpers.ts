import express from 'express';
 
export class Helpers {
    app: express.Application
    constructor(app: express.Application) {
        this.app = app;
    }
}