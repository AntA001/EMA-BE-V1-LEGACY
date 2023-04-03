declare module NodeJS {
    export interface Global {
        __base_path: any,
        __helpers_path: any,
        __emails_path: any,
        __config: any,
        log: any
    } 
}