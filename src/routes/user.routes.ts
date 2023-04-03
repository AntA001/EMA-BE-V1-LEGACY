import express from "express"
import { RoutesConfig } from "../configs/routes.config"

export class UserRoutes extends RoutesConfig {
    constructor(app: express.Application) {
        super(app, "UserRoutes")
    }

    ConfigureRoutes() {
        this.UsefulContactsRoutes()
        this.EmergencyContacts()
        this.UserDataRoutes()
        this.MunicipalityRoutes()
        this.NewsRoutes()
        this.SosAlertsRoutes()
        this.MapPointRoutes()
        this.GuideArticleRoutes()
        this.AuthRoutes()
        this.CategoryRoutes()
        return this.app
    }

    UsefulContactsRoutes() {
        const route = express.Router()
        route.get('/list', this.municipalityController.UsefulContactsList)
        route.get('/categorized-list', this.municipalityController.UsefulContactsCategoryList)
        this.app.use("/api/user/useful-contacts", route)
    }

    EmergencyContacts() {
        const route = express.Router()
        route.get('/list', this.municipalityController.EmergencyContactsList)
        this.app.use("/api/user/emergency-contacts", route)
    }

    UserDataRoutes() {
        const route = express.Router()
        route.post("/save-personal-details", this.userController.SavePersonalDetails)
        route.post("/save-municipal-details", this.userController.SaveMunicipalDetails)
        route.post('/save-profile-image', this.userController.SaveProfileImage)
        route.post('/upload-profile-image', this.userController.UploadProfileImage)
        route.post('/update-profile', this.userController.UpdateUserProfile)
        route.post('/update-profile-details', this.userController.UpdateUserProfileDetails)
        route.get('/personal-contacts/list', this.userController.PersonalEmergencyContactsList)
        route.post('/personal-contacts/delete', this.userController.DeletePersonalEmergencyContacts)
        route.post('/personal-contacts/add', this.userController.AddPersonalEmergencyContacts)
        route.post('/personal-contacts/update', this.userController.UpdatePersonalEmergencyContacts)
        route.get('/notifications/list', this.userController.NotificationList)
        route.get('/notifications/count', this.userController.NotificationCount)
        route.post('/update-user-data', this.userController.UpdateUserData)
        this.app.use("/api/user", route)
    }

    NewsRoutes() {
        const route = express.Router()
        route.get('/list', this.newsController.NewsList)
        this.app.use("/api/user/news", route)
    }

    MunicipalityRoutes() {
        const route = express.Router()
        route.get('/list', this.municipalityController.MunicipalityList)
        route.post('/update', this.userController.UpdateMunicipality)
        this.app.use("/api/user/municipality", route)
    }

    CategoryRoutes() {
        const route = express.Router()
        route.get('/list', this.categoryController.CategoryList)
        route.post('/update', this.userController.UpdateUserCategory)
        this.app.use("/api/user/category", route)
    }

    MapPointRoutes() {
        const route = express.Router()
        route.get('/list', this.mapPointController.MapPointList)
        this.app.use("/api/user/map-points", route)
    }

    SosAlertsRoutes() {
        const route = express.Router()
        route.post('/send', this.sosAlertController.SendSosAlert)
        this.app.use("/api/user/sos-alerts", route)
    }


    GuideArticleRoutes() {
        const route = express.Router()
        route.get('/list', this.guideArticleController.GuideArticleList)
        this.app.use("/api/user/guide-articles", route)
    }

    AuthRoutes() {
        const route = express.Router();
        route.post("/check-login", this.authController.CheckSignIn)
        route.post("/logout", this.authController.SignOut);
        this.app.use("/api/user/auth", route);
    }

}
