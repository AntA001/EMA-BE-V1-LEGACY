import express from "express";
import Joi, { ValidationError } from "joi";
import ContactCategory from '../models/contactCategory';
import Municipality from '../models/municipality';


export class ContactCategoryController {
    private static instance: ContactCategoryController | null = null;

    private constructor() { }

    static init(): ContactCategoryController {
        if (this.instance == null) {
            this.instance = new ContactCategoryController();
        }

        return this.instance;
    }

    async contactCategoryList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        if (req.query?.name) {
            conditions.nameEN = { $regex: req.query.name, $options: "i" }
        }
        if (req.auth?.userType !== 'admin') {
            conditions.status = 'active'
        }
        let contactCategory: any = await ContactCategory.find(conditions);
        res.Success("Contact Categories", contactCategory)
    }


    async UpdateContactCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().required(),
            nameEL: Joi.string().required(),
            nameBG: Joi.string().required(),
            nameMK: Joi.string().required(),
            color: Joi.string().required(),
            defaultCategory: Joi.boolean().required()
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const row: any = await ContactCategory.findOne({ '_id': req.body._id });

        if (row == null) {
            res.Error('contactCategory not Found');
            return;
        }

        let category: any = await ContactCategory.findOne({ defaultCategory: true });

        if (category == null && !req.body.defaultCategory) {
            return res.Error('Pleast add default category first')
        } else if (category) {
            if ((category?._id.toString() == req.body._id) && !req.body.defaultCategory) {
                return res.Error('You cannot remove default status')
            }

            if (category?._id != row._id && req.body.defaultCategory) {
                category.defaultCategory = false
                await category.save()
            }
        }

        ContactCategory.findByIdAndUpdate(req.body._id,
            {
                nameEN: req.body.nameEN,
                nameAL: req.body.nameAL,
                nameEL: req.body.nameEL,
                nameBG: req.body.nameBG,
                nameMK: req.body.nameMK,
                color: req.body.color,
                defaultCategory: req.body.defaultCategory
            }, { new: true }, (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                res.Success("contactCategory Updated", doc);

                Municipality.updateMany({ "usefulContacts.category._id": req.body._id }, {
                    $set: {
                        "usefulContacts.$[element].category": doc
                    }
                },
                    {
                        "arrayFilters": [
                            {
                                "element.category._id": req.body._id
                            }
                        ],
                        "multi": true
                    }, (err: any, doc: any) => {
                        if (err || !doc) return console.log("Something Went Wrong", err, doc);
                    })
            })
    }

    async AddContactCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().allow(null),
            nameEN: Joi.string().required(),
            nameAL: Joi.string().required(),
            nameEL: Joi.string().required(),
            nameBG: Joi.string().required(),
            nameMK: Joi.string().required(),
            color: Joi.string().required(),
            defaultCategory: Joi.boolean().required()
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let category: any = await ContactCategory.findOne({ defaultCategory: true });

        if (category == null && !req.body.defaultCategory) {
            return res.Error('Pleast add default category first')
        }

        let contactCategory: any = await ContactCategory.findOne({ nameEN: req.body.nameEN }).select("-__v");

        if (contactCategory) {
            return res
                .Error('contactCategory Already Exists')
        }

        if (category && req.body.defaultCategory) {
            category.defaultCategory = false
            category.save()
        }

        contactCategory = await ContactCategory.create({
            nameEN: req.body.nameEN,
            nameAL: req.body.nameAL,
            nameEL: req.body.nameEL,
            nameBG: req.body.nameBG,
            nameMK: req.body.nameMK,
            color: req.body.color,
            defaultCategory: req.body.defaultCategory
        })


        await contactCategory.save().then((doc: any) => {
            res.Success("contactCategory Saved", doc);
        }).catch(() => {
            res.Error("Something Went Wrong");
        })
    }



    async UpdateContactCategoryStatus(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            status: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        ContactCategory.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something went wrong", err)
            res.Success("Contact Category Status Updated", doc);
        })

    }


    async DeleteContactCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        let category = await ContactCategory.findOne({ defaultCategory: true })

        let contacts: any = await Municipality.updateMany({ "usefulContacts.category._id": req.body._id }, {
            $set: {
                "usefulContacts.$[element].category": category
            }
        },
            {
                "arrayFilters": [
                    {
                        "element.category._id": req.body._id
                    }
                ],
                "multi": true
            })

        ContactCategory.findByIdAndDelete(req.body._id, (err: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('contactCategory Deleted');
        })
    }

}
