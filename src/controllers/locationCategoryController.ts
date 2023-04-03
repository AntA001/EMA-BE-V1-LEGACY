import express from "express";
import Joi, { ValidationError } from "joi";
import mongoose from 'mongoose';
import MapPoint from '../models/mapPoints';
import Municipality from '../models/municipality';


export class LocationCategoryController {
    private static instance: LocationCategoryController | null = null;

    private constructor() { }

    static init(): LocationCategoryController {
        if (this.instance == null) {
            this.instance = new LocationCategoryController();
        }

        return this.instance;
    }

    async LocationCategoryList(req: express.Request, res: express.Response) {

        if (req.query?.municipality_id && req.query.municipality_id.toString().match(/^[0-9a-fA-F]{24}$/)) {
            let id: any = req.query.municipality_id

            let pipeline: any = [{ $match: { _id: new mongoose.Types.ObjectId(id) } },
            ]

            if (req.query?.name) {
                let filter = [
                    { $unwind: "$locationCategories" },
                    {
                        $match: {
                            "locationCategories.nameEN": { $regex: req.query.name, $options: "i" }
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            nameEN: { "$first": "$nameEN" },
                            nameAL: { "$first": "$nameAL" },
                            locationCategories: { $push: "$locationCategories" }
                        }
                    },
                    { $limit: 1 },
                    {
                        $project: {
                            _id: 0
                        }
                    },
                ]
                pipeline = [...pipeline, ...filter]
            }
            else {
                pipeline = [...pipeline, {
                    $project: {
                        _id: 0,
                        nameEN: 1,
                        nameAL: 1,
                        locationCategories: 1,
                    }
                }, { $limit: 1 }]
            }
            let municipality: any = await Municipality.aggregate(
                pipeline
            )


            res.Success('Location Category list', municipality[0])


        }
        else {
            return res.Error('Municipality Id not present or pattern has issue')
        }
    }

    async DeleteLocationCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        Municipality.findOneAndUpdate({ "locationCategories._id": req.body._id }, {
            $pull:
            {
                "locationCategories": { _id: req.body._id }
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong", err);
            return res.Success('Location Category Deleted');
        });
    }

    async UpdateLocationCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            municipality_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const municipality: any = await Municipality.findOne({ _id: req.body.municipality_id })

        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }

        let category = {
            _id: req.body._id,
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
        };


        Municipality.findOneAndUpdate({ _id: req.body.municipality_id, "locationCategories._id": req.body._id }, {
            $set: {
                "locationCategories.$.nameEN": category.nameEN,
                "locationCategories.$.nameAL": category.nameAL
            }
        }, { new: true }, async (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something Went Wrong");
            await MapPoint.updateMany({ municipality: municipality._id, "category._id": req.body._id }, { category: category })
            return res.Success('Category Updated', category);
        });
    }

    async AddLocationCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.allow(null),
            municipality_id: Joi.string().required(),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let municipality: any = await Municipality.findOne({ _id: req.body.municipality_id })

        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }


        let category = {
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
        };

        Municipality.findOneAndUpdate({ _id: municipality._id }, {
            $push: {
                locationCategories: category
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Location Category Added', doc.locationCategories[doc.locationCategories.length - 1]);
        });
    }

}







