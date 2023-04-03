import express from "express";
import Joi, { ValidationError } from "joi";
import BroadcastMessage from '../models/broadcastMessage';
import Category from '../models/category';
import SosAlert from '../models/sosAlert';
import User from '../models/user';


export class CategoryController {
    private static instance: CategoryController | null = null;

    private constructor() { }

    static init(): CategoryController {
        if (this.instance == null) {
            this.instance = new CategoryController();
        }

        return this.instance;
    }

    async CategoryList(req: express.Request, res: express.Response) {
        const conditions: any = {};

        if (req.auth?.userType !== 'admin') {
            conditions.status = 'active'
        }

        let category: any = await Category.find(conditions).select("-__v");

        res.Success("Categories", category)
    }

    async List(req: express.Request, res: express.Response) {

        const conditions: any = {}

        if (req.query?.name) {
            conditions.$or = [{ nameEN: { $regex: req.query.name, $options: "i" } }, { nameAL: { $regex: req.query.name, $options: "i" } }]

        }

        let category: any = await Category.find(conditions);

        if (req.auth?.userType === 'admin') {
            console.log(req.auth?.userType === 'admin');

            for (let i = 0; i < category.length; i++) {
                if (category[i].password)
                    category[i].password = Buffer.from(category[i].password, 'base64').toString('ascii')
            }
        }

        res.Success("Categories", category)
    }



    async AddCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().allow(null),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().required(),
            nameEL: Joi.string().required(),
            nameBG: Joi.string().required(),
            nameMK: Joi.string().required(),
            locked: Joi.boolean().required(),
            password: Joi.string().min(2).when('locked', { is: true, then: Joi.required(), otherwise: Joi.allow(null) }),
            confirmPassword: Joi.string().min(2).when('locked', { is: true, then: Joi.required(), otherwise: Joi.allow(null) })
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        if (req.body.locked && (req.body?.password !== req.body?.confirmPassword)) {
            res.Error("password and confirm password does'nt match")
            return
        }

        let category: any = await Category.findOne({ $or: [{ nameEN: req.body.nameEN }, { nameEN: req.body.nameAL }] });

        if (category) {
            return res
                .Error('Category Already Exists')
        }



        let categoryData: any = {
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
            nameEL: req.body.nameEL,
            nameBG: req.body.nameBG,
            nameMK: req.body.nameMK,
        }

        if (req.body.locked && req.body.password) {
            categoryData.locked = req.body.locked
            categoryData.password = Buffer.from(req.body.password).toString('base64')
        }

        category = await Category.create(categoryData)


        await category.save().then(() => {
            category.password = Buffer.from(category.password, 'base64').toString('ascii')
            res.Success("Category Saved", category);
        }).catch(() => {
            res.Error("Something Went Wrong");
        })


    }

    async UpdateCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().required(),
            nameEL: Joi.string().required(),
            nameBG: Joi.string().required(),
            nameMK: Joi.string().required(),
            locked: Joi.boolean().required(),
            password: Joi.string().min(2).when('locked', { is: true, then: Joi.required(), otherwise: Joi.allow(null) }),
            confirmPassword: Joi.string().min(2).when('locked', { is: true, then: Joi.required(), otherwise: Joi.allow(null) })
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        if (req.body.locked && (req.body?.password !== req.body?.confirmPassword)) {
            res.Error("password and confirm password does'nt match")
            return
        }

        let categoryData: any = {
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
            nameEL: req.body.nameEL,
            nameBG: req.body.nameBG,
            nameMK: req.body.nameMK,
        }

        if (req.body.locked && req.body.password) {
            categoryData.locked = req.body.locked
            categoryData.password = Buffer.from(req.body.password).toString('base64')
        }


        Category.findByIdAndUpdate(req.body._id, categoryData, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err);
            User.updateMany({ "category._id": doc._id }, { category: doc }, (err: any, doc1: any) => {
                if (err) return res.Error("Something went wrong", err);
            })
            SosAlert.updateMany({ "user.category._id": doc._id }, { "user.category": doc }, (err: any, doc1: any) => {
                if (err) return res.Error("Something went wrong", err);
            })
            BroadcastMessage.updateMany({ "category._id": doc._id }, { "category": doc }, (err: any, doc1: any) => {
                if (err) return res.Error("Something went wrong", err);
            })
            doc.password = Buffer.from(doc.password, 'base64').toString('ascii')
            res.Success("Category Updated", doc);
        })
    }

    async UpdateCategoryStatus(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            status: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        Category.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)
            res.Success("Category Status Updated", doc);
        })

    }

    async CategoryDetail(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.query);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const row: any = await Category.findOne({ '_id': req.query._id });

        if (row == null) {
            res.Error('Id not Found');
            return;
        }

        return res.Success("detail", row);
    }

    async DeleteCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        Category.findByIdAndRemove(req.body._id, (err: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Category Deleted');
        })
    }

}
