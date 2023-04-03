import express from "express";
import Joi, { ValidationError } from "joi";
import MapPoint from '../models/mapPoints';
import Municipality from '../models/municipality';

export class MapPointController {
    private static instance: MapPointController | null = null;

    private constructor() { }

    static init(): MapPointController {
        if (this.instance == null) {
            this.instance = new MapPointController();
        }
        return this.instance;
    }

    async MapPointList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        let mapPoints: any
        if (req.auth?.municipality) {
            conditions.municipality = req.auth.municipality._id;
        }
        if (req.auth?.userType !== 'admin') {
            conditions.status = 'active'
            mapPoints = await MapPoint.find(conditions).select("-__v")
        } else {
            if (req.query?.municipality) {
                conditions.municipality = req.query.municipality;
            }
            if (req.query?.name) {
                conditions.$or = [{ nameEN: { $regex: req.query.name, $options: "i" } }, { nameAL: { $regex: req.query.name, $options: "i" } }]
            }
            mapPoints = await MapPoint.find(conditions).populate("municipality", "country nameEN nameAL").select("-__v")
        }

        res.Success("Map Points", mapPoints)
    }


    async AddMapPoint(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().allow(null),
            lat: Joi.number().required(),
            lng: Joi.number().required(),
            nameEN: Joi.string().required(),
            nameAL: Joi.string(),
            addressEN: Joi.string(),
            addressAL: Joi.string(),
            phoneNo: Joi.string(),
            municipality_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            category_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        const municipality: any = await Municipality.findOne({ _id: req.body.municipality_id, "locationCategories.$._id": req.body.catergory_id }).select("locationCategories");


        const category = municipality.locationCategories.id(req.body.category_id)

        if (municipality == null || !category) {
            res.Error("Municipality Not Found")
            return
        }


        let point: any = await MapPoint.findOne({ lat: req.body.lat, lng: req.body.lng, "municipality": req.body.municipality_id }).select("-__v");
        if (point) {
            return res
                .Error('Point Already Exists')
        }

        point = await MapPoint.create({
            lat: req.body.lat,
            lng: req.body.lng,
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
            addressEN: req.body.addressEN,
            addressAL: req.body.addressAL,
            phoneNo: req.body.phoneNo,
            municipality: municipality._id,
            category: category
        })

        await point.save().then(() => {
            point.populate('municipality', 'nameEN nameAL country', function (err: any, doc: any) {
                if (err) return res.Error("Something went wrong", err);
                res.Success("Map Point Saved Successfully", doc);
            })

        }).catch(() => {
            res.Error("Something Went Wrong");
        })


    }

    public async UpdateMapPoint(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            lat: Joi.number(),
            lng: Joi.number(),
            nameEN: Joi.string(),
            nameAL: Joi.string(),
            addressEN: Joi.string(),
            addressAL: Joi.string(),
            phoneNo: Joi.string(),
            category_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
            municipality_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const municipality: any = await Municipality.findOne({ _id: req.body.municipality_id, "locationCategories.$._id": req.body.catergory_id }).select("locationCategories");

        const category = municipality.locationCategories.id(req.body.category_id)

        if (municipality == null || !category) {
            res.Error("Municipality Not Found")
            return
        }


        const row: any = await MapPoint.findById(req.body._id);

        if (row == null) {
            res.Error('Point not Found');
            return;
        }

        const mapPoint: any = {
            lat: req.body.lat,
            lng: req.body.lng,
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
            addressEN: req.body.addressEN,
            addressAL: req.body.addressAL,
            phoneNo: req.body.phoneNo,
            municipality: municipality._id,
            category: category
        }

        MapPoint.findByIdAndUpdate(req.body._id, mapPoint, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err);
            doc.populate('municipality', 'nameEN nameAL country', function (err: any, doc: any) {
                if (err) return res.Error("Something went wrong", err);
                res.Success("Map Point Updated", doc);
            })
        })
    }

    async DeleteMapPoint(req: express.Request, res: express.Response) {

        (global as any).log.error('abc')
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        await MapPoint.findByIdAndDelete({ '_id': req.body._id });

        return res.Success('Map Point Deleted successfully');
    }

    async UpdateMapPointStatus(req: express.Request, res: express.Response) {
        (global as any).log.error('abc')
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            status: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        MapPoint.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)
            res.Success("Point Status Updated", doc);
        })

    }

}
