require("dotenv").config();

module.exports = {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        define: {
            underscored: true,
            charset: "utf8",
            collate: "utf8_general_ci",
        },
        dialect: "mysql",
    },
    test: {
        username: "root",
        password: null,
        database: "database_test",
        host: "127.0.0.1",
        dialect: "mysql",
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        define: {
            underscored: true,
            charset: "utf8",
            collate: "utf8_general_ci",
        },
        dialect: "mysql",
    },
};
