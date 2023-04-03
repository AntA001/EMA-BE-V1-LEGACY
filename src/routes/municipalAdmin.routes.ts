import express from "express";
import { RoutesConfig } from "../configs/routes.config";

export class MunicipalAdminRoutes extends RoutesConfig {
    constructor(app: express.Application) {
        super(app, "MuncipalAdminRoutes");
    }



    ConfigureRoutes() {
        this.NewsRoutes();
        this.EmergencyContactsRoutes();
        this.UsefulContactsRoutes();
        this.BroadcastMessageRoutes();
        this.SosAlertsRoutes();
        this.MunicipalityRoutes();
        this.ContactCategoryRoutes();
        this.UserRoutes()


        const route = express.Router();
        route.post("/change-password", this.authController.ChangePassword)
        this.app.use("/api/municipal-admin", route);

        return this.app;
    }


    MunicipalityRoutes() {
        const route = express.Router();
        route.get('/sms-count', this.municipalityController.MunicipalitySmsCount);
        this.app.use("/api/municipal-admin/municipality", route);
    }


    UsefulContactsRoutes() {
        const route = express.Router();
        route.get('/list', this.municipalityController.UsefulContactsList);
        route.post('/delete', this.municipalityController.DeleteUsefulContacts);
        route.post('/add', this.municipalityController.AddUsefulContacts);
        route.post('/update', this.municipalityController.UpdateUsefulContacts);
        this.app.use("/api/municipal-admin/useful-contacts", route);

    }

    EmergencyContactsRoutes() {
        const route = express.Router();
        route.get('/list', this.municipalityController.EmergencyContactsList);
        route.post('/rearrange-list', this.municipalityController.RearrangeEmergencyContactsList);
        route.post('/delete', this.municipalityController.DeleteEmergencyContacts);
        route.post('/add', this.municipalityController.AddEmergencyContacts);
        route.post('/update', this.municipalityController.UpdateEmergencyContacts);
        route.get('/copy', this.municipalityController.CopyImagesToStorage);
        this.app.use("/api/municipal-admin/emergency-contacts", route);
    }


    NewsRoutes() {
        const route = express.Router();
        route.get('/list', this.newsController.NewsList);
        route.post('/add', this.newsController.AddNews);
        route.get('/detail', this.newsController.NewsDetail);
        route.post('/update', this.newsController.UpdateNews);
        route.post('/delete', this.newsController.DeleteNews);
        route.get('/copy', this.newsController.CopyImagesToStorage);
        this.app.use("/api/municipal-admin/news", route);
    }

    BroadcastMessageRoutes() {
        const route = express.Router();
        route.get('/list', this.broadcastMessageController.BroadcastMessageList);
        route.post('/send', this.broadcastMessageController.SendBroadcastMessage);
        route.post('/delete', this.broadcastMessageController.DeleteBroadcastMessage);
        this.app.use("/api/municipal-admin/broadcast-message", route);
    }

    SosAlertsRoutes() {
        const route = express.Router();
        route.get('/list', this.sosAlertController.SosAlertList);
        route.post('/read', this.sosAlertController.ReadSOS);
        this.app.use("/api/municipal-admin/sos-alerts", route);
    }


    ContactCategoryRoutes() {
        const route = express.Router();
        route.get('/list', this.contactCategoryController.contactCategoryList);
        this.app.use("/api/municipal-admin/contact-category", route);
    }

    UserRoutes() {
        const route = express.Router();
        route.get('/list', this.userController.userList);
        route.get('/copy', this.userController.CopyImagesToStorage);
        this.app.use("/api/municipal-admin/user", route);

    }

}
