import { languages } from './../constants/languages';
import express from "express";
import Joi, { ValidationError } from "joi";
import Country from '../models/country';
import Municipality from '../models/municipality';
import User from '../models/user';

export class CountryController {
    private static instance: CountryController | null = null;

    private constructor() { }

    static init(): CountryController {
        if (this.instance == null) {
            this.instance = new CountryController();
        }

        return this.instance;
    }

    async CountryList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        if (req.query?.name) {
            conditions.nameEN = { $regex: req.query.name, $options: "i" }
        }
        if (req.auth?.userType !== 'admin') {
            conditions.status = 'active'
        }
        let country: any = await Country.find(conditions);
        res.Success("Countries", country)
    }


    async LanguageList(req: express.Request, res: express.Response) {
        res.Success("languages", languages)
    }


    async UpdateCountry(req: express.Request, res: express.Response) {

        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().allow(null),
            nativeLanguage: Joi.string().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const row: any = await Country.findOne({ '_id': req.body._id });

        if (row == null) {
            res.Error('Country not Found');
            return;
        }

        let language = languages.find(lang => lang.code === req.body.nativeLanguage);

        Country.findByIdAndUpdate(req.body._id,
            {
                nameEN: req.body.nameEN,
                nameAL: req.body?.nameAL ? req.body?.nameAL : '-',
                nativeLanguage: language ? language : null
            }, { new: true }, (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                Municipality.updateMany({ "country._id": doc._id }, { country: doc }, (err: any, doc1: any) => {
                    if (err) return res.Error("Something went wrong", err);
                    User.updateMany({ "municipality.country._id": doc._id }, { "municipality.country": doc }, (err: any, doc1: any) => {
                        if (err) res.Error("Something went wrong", err);
                        res.Success("Country Updated", doc);
                    })
                })

            })
    }

    async AddCountry(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().allow(null),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().allow(null),
            nativeLanguage: Joi.string().allow(null)
        });


        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let country: any = await Country.findOne({ nameEN: req.body.nameEN }).select("-__v");

        if (country) {
            return res
                .Error('Country Already Exists')
        }

        let language = languages.find(lang => lang.code === req.body.nativeLanguage);

        country = await Country.create({
            nameEN: req.body.nameEN,
            nameAL: req.body?.nameAL ? req.body?.nameAL : '-',
            nativeLanguage: language
        })


        await country.save().then((doc: any) => {
            res.Success("Country Saved", doc);
        }).catch(() => {
            res.Error("Something Went Wrong");
        })
    }



    async UpdateCountryStatus(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            status: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        Country.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something went wrong", err)
            res.Success("Municipal Admin Status Updated", doc);
        })

    }


    async DeleteCountry(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        Country.findByIdAndDelete(req.body._id, (err: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Country Deleted');
        })
    }

}
