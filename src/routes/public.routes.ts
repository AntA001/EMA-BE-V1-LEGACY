import express from "express";
import { RoutesConfig } from "../configs/routes.config";

export class PublicRoutes extends RoutesConfig {
    constructor(app: express.Application) {
        super(app, "PublicRoutes");
    }

    ConfigureRoutes() {
        this.AuthRoutes();
        this.CountryRoutes();
        this.MunicipalityRoutes();
        this.CatergoryRoutes();
        this.NewsRoutes();
        this.EmergencyContactsRoutes();
        this.UserDataRoutes();
        this.MapPointRoutes();
        this.GuideArticlesRoutes();
        this.SMSRoutes();
        return this.app;
    }

    SMSRoutes() {
        const route = express.Router();
        route.post('/report', this.broadcastMessageController.SmsCount);
        this.app.use("/api/public/sms", route);
    }

    NewsRoutes() {
        const route = express.Router();
        route.get('/image/:id', this.newsController.NewsImage);
        this.app.use("/api/public/news", route);
    }

    UserDataRoutes() {
        const route = express.Router();
        route.get('/image/:id', this.userController.UserProfileImage);
        route.get('/profile-image/:id', this.userController.ProfileImage);
        this.app.use("/api/public/user", route);
    }

    CountryRoutes() {
        const route = express.Router();
        route.get('/list', this.countryController.CountryList);
        this.app.use("/api/public/country", route);
    }

    MapPointRoutes() {
        const route = express.Router();
        route.post('/add', this.mapPointController.AddMapPoint)
        this.app.use("/api/public/map-points", route);
    }

    MunicipalityRoutes() {
        const route = express.Router();
        route.get('/list/:country_id', this.municipalityController.MunicipalityList);
        route.get('/image/:_id', this.municipalityController.MunicipalityLogo);
        this.app.use("/api/public/municipality", route);
    }

    CatergoryRoutes() {
        const route = express.Router();
        route.get('/list', this.categoryController.CategoryList);
        this.app.use("/api/public/category", route);
    }


    EmergencyContactsRoutes() {
        const route = express.Router();
        route.get('/image/:id', this.municipalityController.EmergenyContactImage);
        this.app.use("/api/public/emergency-contacts", route);
    }

    AuthRoutes() {
        const route = express.Router();
        route.post('/send-verification-code', this.authController.SendVerificationCode);
        route.post('/verify-code', this.authController.VerifyCode);
        route.post("/login", this.authController.SignIn);
        route.post("/forgot-password", this.authController.ForgotPassword);
        route.post("/reset-password", this.authController.ResetPassword);
        this.app.use("/api/public/auth", route);
    }

    GuideArticlesRoutes() {
        const route = express.Router();
        route.get('/image/:id', this.guideArticleController.GuideArticleImage);
        this.app.use("/api/public/guide-articles", route);
    }

}
