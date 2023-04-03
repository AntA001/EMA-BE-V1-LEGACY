import { ContactCategoryController } from './../controllers/contactCategoryController';
import { MapPointController } from './../controllers/mapPointController';
import { BroadcastMessageController } from './../controllers/broadcastMessageController';
import express from "express";
import { UserController } from './../controllers/userController';
import { AuthController } from "../controllers/authController";
import { CountryController } from '../controllers/countryController';
import { MunicipalityController } from '../controllers/municipalityController';
import { CategoryController } from './../controllers/categoryController';
import { NewsController } from '../controllers/newsController';
import { SosAlertController } from '../controllers/sosAlertController'
import { GuideArticleController } from '../controllers/guideArticleController';
import { LocationCategoryController } from '../controllers/locationCategoryController';




export abstract class RoutesConfig {
    app: express.Application;
    name: string;

    /* -----------------------------------
     * Define Controllers
     * ----------------------------------- */
    authController: AuthController = AuthController.init();
    userController: UserController = UserController.init();
    municipalityController: MunicipalityController = MunicipalityController.init();
    countryController: CountryController = CountryController.init();
    categoryController: CategoryController = CategoryController.init();
    newsController: NewsController = NewsController.init();
    broadcastMessageController: BroadcastMessageController = BroadcastMessageController.init();
    sosAlertController: SosAlertController = SosAlertController.init();
    mapPointController: MapPointController = MapPointController.init();
    guideArticleController: GuideArticleController = GuideArticleController.init();
    locationCategoryController: LocationCategoryController = LocationCategoryController.init();
    contactCategoryController: ContactCategoryController = ContactCategoryController.init();


    constructor(app: express.Application, name: string) {
        this.app = app;
        this.name = name;
        this.ConfigureRoutes();
    }

    getName() {
        return this.name;
    }

    abstract ConfigureRoutes(): express.Application;
}
