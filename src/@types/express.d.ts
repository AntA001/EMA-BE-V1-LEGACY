import fs from 'fs';

declare global {
    namespace Express {
        interface Request {
            auth: any;
        }

        interface Response {
            Success(message: string, data?: any, responseCode?: number): void;
            Error(message: string, data?: any, responseCode?: number): void;
        }
    }
}
