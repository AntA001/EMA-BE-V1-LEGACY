import express from "express";
import { RoutesConfig } from "../configs/routes.config";

export class AdminRoutes extends RoutesConfig {
    constructor(app: express.Application) {
        super(app, "AdminRoutes");
    }

    ConfigureRoutes() {
        this.MunicipalityRoutes()
        this.MunicipalityAdminRoutes();
        this.CategoryRoutes();
        this.MapPointRoutes();
        this.CountryRoutes();
        this.GuideArticleRoutes();
        this.LocationCategoryRoutes();
        this.ContactCategoryRoutes();

        const route = express.Router();

        this.app.use("/api/admin", route);

        return this.app;
    }

    MunicipalityAdminRoutes() {
        const route = express.Router();
        route.get('/list', this.userController.MunicipalAdminList);
        route.get('/types/list', this.userController.MunicipalAdminTypeList);
        route.post('/add', this.userController.AddMunicipalAdmin);
        route.post('/update', this.userController.UpdateMunicipalAdmin);
        route.post('/update-status', this.userController.UpdateMunicipalAdminStatus);
        route.post('/delete', this.userController.DeleteMunicipalAdmin);
        this.app.use("/api/admin/municipal-admin", route);
    }


    MunicipalityRoutes() {
        const route = express.Router();
        route.get('/list', this.municipalityController.MunicipalityList);
        route.post('/add', this.municipalityController.AddMunicipality);
        route.post('/update', this.municipalityController.UpdateMunicipality);
        route.post('/update-status', this.municipalityController.UpdateMunicipalityStatus);
        route.get('/update-logo-status', this.municipalityController.UpdateMunicipalityLogoStatus);
        route.post('/delete', this.municipalityController.DeleteMunicipality);
        this.app.use("/api/admin/municipality", route);
    }

    CategoryRoutes() {
        const route = express.Router();
        route.get('/list', this.categoryController.List);
        route.post('/add', this.categoryController.AddCategory);
        route.post('/update', this.categoryController.UpdateCategory);
        route.post('/update-status', this.categoryController.UpdateCategoryStatus);
        route.post('/delete', this.categoryController.DeleteCategory);
        route.post('/detail', this.categoryController.CategoryDetail);
        this.app.use("/api/admin/category", route);
    }

    CountryRoutes() {
        const route = express.Router();
        route.get('/list', this.countryController.CountryList);
        route.post('/add', this.countryController.AddCountry);
        route.post('/update', this.countryController.UpdateCountry);
        route.post('/update-status', this.countryController.UpdateCountryStatus);
        route.post('/delete', this.countryController.DeleteCountry);
        route.get('/language/list', this.countryController.LanguageList);
        this.app.use("/api/admin/country", route);
    }

    MapPointRoutes() {
        const route = express.Router()
        route.get('/list', this.mapPointController.MapPointList)
        route.post('/add', this.mapPointController.AddMapPoint)
        route.post('/update', this.mapPointController.UpdateMapPoint)
        route.post('/update-status', this.mapPointController.UpdateMapPointStatus);
        route.post('/delete', this.mapPointController.DeleteMapPoint)
        this.app.use("/api/admin/map-points", route)
    }

    GuideArticleRoutes() {
        const route = express.Router()
        route.get('/list', this.guideArticleController.GuideArticleList)
        route.post('/add', this.guideArticleController.AddGuideArticle)
        route.post('/update', this.guideArticleController.UpdateGuideArticle)
        route.post('/update-status', this.guideArticleController.UpdateGuideArticleStatus)
        route.get('/detail', this.guideArticleController.GuideArticleDetail);
        route.post('/delete', this.guideArticleController.DeleteGuideArticle)
        route.get('/copy', this.guideArticleController.CopyImagesToStorage);
        this.app.use("/api/admin/guide-articles", route)
    }

    LocationCategoryRoutes() {
        const route = express.Router();
        route.get('/list', this.locationCategoryController.LocationCategoryList);
        route.post('/add', this.locationCategoryController.AddLocationCategory);
        route.post('/update', this.locationCategoryController.UpdateLocationCategory);
        route.post('/delete', this.locationCategoryController.DeleteLocationCategory);
        this.app.use("/api/admin/location-category", route);
    }

    ContactCategoryRoutes() {
        const route = express.Router();
        route.get('/list', this.contactCategoryController.contactCategoryList);
        route.post('/add', this.contactCategoryController.AddContactCategory);
        route.post('/update', this.contactCategoryController.UpdateContactCategory);
        route.post('/delete', this.contactCategoryController.DeleteContactCategory);
        route.post('/update-status', this.contactCategoryController.UpdateContactCategoryStatus);
        this.app.use("/api/admin/contact-category", route);
    }

}
