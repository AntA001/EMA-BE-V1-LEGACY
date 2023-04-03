import express, { request } from "express";
import Joi, { ValidationError } from "joi";
import Country from '../models/country';
import Municipality from '../models/municipality';
import User from '../models/user';
import ContactCategory from '../models/contactCategory';
import multer from 'multer'
import path from 'path';
import fs from 'fs'


export class MunicipalityController {
    private static instance: MunicipalityController | null = null;

    private constructor() { }

    static init(): MunicipalityController {
        if (this.instance == null) {
            this.instance = new MunicipalityController();
        }

        return this.instance;
    }


    async MunicipalityLogo(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'municipality-logos');
        const dir = path.resolve('./', 'storage', 'images');
        if (req.params._id && req.params._id.toString().match(/^[0-9a-fA-F]{24}$/)) {
            let id = req.params._id.toString()
            res.sendFile(storagePath + '/' + id + '.jpg', err => {
                if (err)
                    res.sendFile(dir + "/no-image.jpg")
            })
        } else {
            res.sendFile(dir + "/no-image.jpg")
        }
    }


    async UpdateMunicipalityLogoStatus(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'municipality-logos');
        fs.readdir(storagePath, (err, files) => {
            files.forEach(async (file: any) => {
                let id = file.split(".")[0];
                if (id.length == 24) {
                    console.log(id);
                    await Municipality.findByIdAndUpdate(id, {
                        logo: true
                    }, { new: true }, (err: any, doc: any) => {
                        if (err) {
                            return console.log(err);
                        }
                        User.updateMany({ "municipality._id": doc._id }, { municipality: doc }, (err: any, doc1: any) => {
                            if (err) return console.log(err);

                        })

                    })
                }
            });
            res.Success('Done')
        });
    }


    async CopyImagesToStorage(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'emergency-contact-images');

        let id: any = req.query?.id;
        if (id === '1122') {
            let articles: any = await Municipality.find();
            console.log('got articles');

            articles.map((article: any) => {
                if (article?.emergencyContacts.length > 0) {
                    let contacts = article?.emergencyContacts
                    if (contacts) {
                        contacts.map((contact: any) => {
                            if (contact?.image) {
                                var base64Data = contact.image.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '')
                                fs.writeFile(storagePath + '/' + contact._id + '.jpg', base64Data, 'base64', function (err: any) {
                                    console.log('ewqeqw', err);
                                });
                                console.log(storagePath + '/' + contact._id + '.jpg');
                            }
                        })
                    }
                }
            })
        }

    }


    async MunicipalityList(req: express.Request, res: express.Response) {
        const conditions: any = {};
        let projection: String = ""

        if (req.auth?.userType !== 'admin') {
            projection = "nameEN nameAL"
            conditions.status = "active"
            if (req.params?.country_id) {
                if (req.params.country_id.match(/^[0-9a-fA-F]{24}$/)) {
                    conditions["country._id"] = req.params.country_id;

                }
                else {
                    res.Error('Invalid country id pattren or no id given')
                    return
                }

            }
            else if (req.auth) {
                conditions["country._id"] = req.auth.municipality.country._id;
            }
            else {
                res.Error('Country not Found')
                return
            }
        }
        else {
            projection = "-emergencyContacts -usefulContacts"
            if (req.query?.country_id) {
                let id: String = req.query?.country_id.toString()
                if (id.match(/^[0-9a-fA-F]{24}$/)) {
                    conditions["country._id"] = id;
                }
            }
            if (req.query?.name) {
                conditions.nameEN = { $regex: req.query.name, $options: "i" }
            }
        }

        let municipality: any = await Municipality.find(conditions).select(projection);

        res.Success("Muncipalities", municipality)

    }


    async MunicipalitySmsCount(req: express.Request, res: express.Response) {
        const conditions: any = { _id: req.auth.municipality._id };
        let projection = "maxSmsCount smsCount inProgressSms"

        let municipality = await Municipality.findOne(conditions).select(projection);
        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }

        res.Success("SMS count", municipality)
    }

    async AddMunicipality(req: express.Request, res: express.Response) {

        const storagePath = path.resolve('./', 'storage', 'municipality-logos');
        const upload = multer({
            storage: multer.diskStorage({
                destination: storagePath,
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
                    callback(null, `${file.originalname}-${uniqueSuffix}`)
                }
            }),
            fileFilter: (req, file, callback) => {
                const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

                if (allowedTypes.indexOf(file.mimetype) < 0) {
                    callback(new Error(`${file.mimetype} is not allowed`));
                } else {
                    callback(null, true);
                }
            }
        }).single('logo')

        upload(req, res, async (err: any) => {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                res.Error('Some error occured', err);
            } else if (err) {
                // An unknown error occurred when uploading.
                res.Error('Some error occured', err);
            } else {

                const schema = Joi.object().keys({
                    _id: Joi.string().allow(null),
                    nameEN: Joi.string().required(),
                    nameAL: Joi.string().allow(null),
                    country_id: Joi.string().required(),
                    max_sms_count: Joi.number().required(),
                    facebookLink: Joi.string().allow(null),
                    twitterLink: Joi.string().allow(null),
                    webLink: Joi.string().allow(null),
                    instagramLink: Joi.string().allow(null),
                    youtubeLink: Joi.string().allow(null),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                const country = await Country.findOne({ _id: req.body.country_id });

                if (country == null) {
                    return res.Error('Country Not Found')
                }

                let municipality: any = await Municipality.findOne({ nameEN: req.body.nameEN, "country._id": req.body.country_id })


                if (municipality) {
                    return res.Error('Municipality Already Exists')
                }


                municipality = await Municipality.create({
                    nameEN: req.body.nameEN,
                    nameAL: req.body?.nameAL ? req.body?.nameAL : '-',
                    country: country,
                    maxSmsCount: req.body.max_sms_count,
                    facebookLink: req.body.facebookLink,
                    twitterLink: req.body.twitterLink,
                    webLink: req.body.webLink,
                    instagramLink: req.body.instagramLink,
                    youtubeLink: req.body.youtubeLink
                })

                await municipality.save().then((doc: any) => {
                    let municipality = doc.toObject();
                    delete municipality?.usefulContacts;
                    delete municipality?.emergencyContacts;
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    res.Success("Municipality Saved", municipality);
                }).catch(() => {
                    res.Error("Something Went Wrong");
                })
            }
        })
    }



    async DeleteMunicipality(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        // let municipality: any = Municipality.findOne({ name: req.body.name, "country._id": req.body.country_id })

        // if (municipality == null) {
        //     return res.Error("Municipality Dosen't Exists")
        // }

        // const country = await Country.findOne({ _id: req.body.country_id });

        // if (country == null) {
        //     return res.Error('Country Not Found')
        // }


        // Country.findByIdAndUpdate(req.body._id,
        //     {
        //         name: req.body.name,
        //         lat: req.body.lat,
        //         lng: req.body.lng,
        //         country: country,
        //     }, { new: true }, (err: any, doc: any) => {
        //         if (err) return res.Error("Something went wrong", err);
        //         Municipality.updateMany({ "country._id": doc._id }, { country: doc }, (err: any, doc1: any) => {
        //             if (err) return res.Error("Something went wrong", err);
        //             res.Success("Country Updated", doc);
        //         })
        //     })

    }

    async UpdateMunicipality(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'municipality-logos');
        const upload = multer({
            storage: multer.diskStorage({
                destination: storagePath,
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
                    callback(null, `${file.originalname}-${uniqueSuffix}`)
                }
            }),
            fileFilter: (req, file, callback) => {
                console.log(file);

                const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

                if (allowedTypes.indexOf(file.mimetype) < 0) {
                    callback(new Error(`${file.mimetype} is not allowed`));
                } else {
                    callback(null, true);
                }
            }
        }).single('logo')

        upload(req, res, async (err: any) => {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                res.Error('Some error occured', err);
            } else if (err) {
                // An unknown error occurred when uploading.
                res.Error('Some error occured', err);
            } else {
                const schema = Joi.object().keys({
                    _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
                    nameEN: Joi.string().required(),
                    nameAL: Joi.string().allow(null),
                    country_id: Joi.string().required(),
                    max_sms_count: Joi.number().required(),
                    facebookLink: Joi.string().allow(null),
                    twitterLink: Joi.string().allow(null),
                    webLink: Joi.string().allow(null),
                    instagramLink: Joi.string().allow(null),
                    youtubeLink: Joi.string().allow(null),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                const country = await Country.findOne({ _id: req.body.country_id });

                if (country == null) {
                    return res.Error('Country Not Found')
                }


                let municipality: any = await Municipality.findById(req.body._id)

                if (municipality == null) {
                    return res.Error("Municipality Dosen't Exists")
                }

                Municipality.findByIdAndUpdate(req.body._id,
                    {
                        nameEN: req.body.nameEN,
                        nameAL: req.body?.nameAL ? req.body?.nameAL : '-',
                        country: country,
                        maxSmsCount: req.body.max_sms_count,
                        facebookLink: req.body.facebookLink,
                        twitterLink: req.body.twitterLink,
                        webLink: req.body.webLink,
                        instagramLink: req.body.instagramLink,
                        youtubeLink: req.body.youtubeLink,
                        logo: municipality?.logo == true ? municipality?.logo : municipality?.logo == false && req.file ? true : false
                    }, { new: true }, (err: any, doc: any) => {
                        if (err) return res.Error("Something went wrong", err);
                        if (req.file)
                            fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                        User.updateMany({ "municipality._id": doc._id }, { municipality: doc }, (err: any, doc1: any) => {
                            if (err) return res.Error("Something went wrong", err);
                            res.Success("Municipality Updated", doc);
                        })
                    }).select('-emergencyContacts -usefulContacts')
            }
        })
    }

    async UpdateMunicipalityStatus(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            status: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        Municipality.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something went wrong", err)
            res.Success("Municipality Status Updated", doc);
        })

    }



    async EmergenyContactImage(req: express.Request, res: express.Response) {
        // const conditions: any = {}
        // if (req.params?.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        //     conditions['emergencyContacts._id'] = req.params.id
        // }
        // else {
        //     res.sendFile(dir + "/storage/images/no-image.jpg")
        //     return
        // }

        // let image: any = await Municipality.findOne(conditions, "emergencyContacts.$");


        // if (image?.emergencyContacts.length > 0 && image.emergencyContacts[0].image) {
        //     var base64Data = image.emergencyContacts[0].image.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '')
        //     var img = Buffer.from(base64Data, 'base64');
        //     res.writeHead(200, {
        //         'Content-Type': 'image/png',
        //         'Content-Length': img.length
        //     });
        //     res.end(img);
        //     return
        // } else {
        //     res.sendFile(dir + "/storage/images/no-image.jpg")
        //     return
        // }

        const dir = path.resolve('./', 'storage', 'images');
        const storagePath = path.resolve('./', 'storage', 'emergency-contact-images');
        if (req.params.id) {
            let id = req.params.id.toString()
            res.sendFile(storagePath + '/' + id + '.jpg', err => {
                if (err)
                    res.sendFile(dir + "/no-image.jpg")
            })
        }
        else {
            res.sendFile(dir + "/no-image.jpg")
        }

    }


    async AddEmergencyContacts(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'emergency-contact-images');
        const upload = multer({
            storage: multer.diskStorage({
                destination: storagePath,
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
                    callback(null, `${file.originalname}-${uniqueSuffix}`)
                }
            }),
            fileFilter: (req, file, callback) => {
                const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

                if (allowedTypes.indexOf(file.mimetype) < 0) {
                    callback(new Error(`${file.mimetype} is not allowed`));
                } else {
                    callback(null, true);
                }
            }
        }).single('image')

        upload(req, res, async (err: any) => {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                res.Error('Some error occured', err);
            } else if (err) {
                // An unknown error occurred when uploading.
                res.Error('Some error occured', err);
            } else {
                const schema = Joi.object().keys({
                    _id: Joi.allow(null),
                    titleEN: Joi.string().required(),
                    titleAL: Joi.string().required(),
                    contact: Joi.string().required(),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                let municipality: any = await Municipality.findOne({ _id: req.auth.municipality._id })

                if (municipality == null) {
                    return res.Error('Municipality Not Found')
                }
                // else if (municipality?.emergencyContacts.length === 3) {
                //     return res.Error('You can only add upto 3 emergency contacts')
                // }


                const contact: any = {
                    titleEN: req.body.titleEN,
                    titleAL: req.body.titleAL,
                    contact: req.body.contact,
                };


                Municipality.findOneAndUpdate({ _id: municipality._id }, {
                    $push: {
                        emergencyContacts: contact
                    }
                }, { new: true }, (err: any, doc: any) => {
                    if (err) return res.Error("Something Went Wrong");
                    let contact: any = doc.toObject().emergencyContacts[doc.emergencyContacts.length - 1]
                    delete contact.image
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, contact._id + '.jpg'));
                    return res.Success('Contact Added', contact);
                });
            }
        })
    }



    async AddUsefulContacts(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.allow(null),
            titleEN: Joi.string().required(),
            titleAL: Joi.string().required(),
            contact: Joi.string().required(),
            categoryId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let municipality: any = await Municipality.findOne({ _id: req.auth.municipality._id })

        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }


        let category: any = await ContactCategory.findOne({ _id: req.body.categoryId })

        if (category == null) {
            return res.Error('Contact Category Not Found')
        }

        let contact = {
            titleEN: req.body.titleEN,
            titleAL: req.body.titleAL,
            contact: req.body.contact,
            category
        };

        Municipality.findOneAndUpdate({ _id: municipality._id }, {
            $push: {
                usefulContacts: contact
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Contact Added', doc.usefulContacts[doc.usefulContacts.length - 1]);
        });
    }


    async EmergencyContactsList(req: express.Request, res: express.Response) {
        // const pipeline: any = [
        //     { $match: { _id: new mongoose.Types.ObjectId(req.auth.municipality._id) } },
        //     { $unwind: "$emergencyContacts" },
        //     { $project: { _id: 1, emergencyContacts: 1, } }, {
        //         $group: {
        //             _id: '$_id',
        //             contacts: { $push: { _id: '$emergencyContacts._id', title: '$emergencyContacts.title', contact: '$emergencyContacts.contact' } }
        //         }
        //     }
        // ]

        // let regex;
        // if (req.query?.name) {
        //     regex = new RegExp(`${req.query.name}`, 'i');
        //     pipeline.splice(3, 0, {
        //         $match: {
        //             "emergencyContacts.title": {
        //                 $regex: regex
        //             }
        //         }
        //     },
        //     )
        // }

        // console.log(pipeline)



        // // Municipality.findOne({
        // //     _id: req.auth.municipality._id
        // // }
        // // ).populate({
        // //     path: 'emergencyContacts',
        // //     match: { title: { $regex: req.query.name, $options: "i" } },
        // //     select: '-image'
        // // })
        // //     .exec((err: any, doc: any) => {
        // //         res.Success('Contact list', doc)

        // //     })

        // let municipality: any = await Municipality.aggregate(
        //     pipeline
        // )


        // // if (municipality == null) {
        // //     return res.Error('Municipality Not Found')
        // // }
        // // let contacts: any = municipality.toObject().emergencyContacts ? municipality.toObject().emergencyContacts : []
        // // contacts.forEach((element: any, index: number) => {
        // //     delete contacts[index].image;
        // res.Success('Contact list', municipality)

        const conditions: any = { _id: req.auth.municipality._id }
        let municipality: any = await Municipality.findOne(conditions)
        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }
        let contacts: any = municipality.toObject().emergencyContacts ? municipality.toObject().emergencyContacts : []
        contacts.forEach((element: any, index: number) => {
            delete contacts[index].image;
        });
        res.Success('Contact list', contacts)

    }

    async RearrangeEmergencyContactsList(req: express.Request, res: express.Response) {

        const schema = Joi.object().keys({
            oldIndex: Joi.number().required(),
            newIndex: Joi.number().required()
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }


        const conditions: any = { _id: req.auth.municipality._id }
        let municipality: any = await Municipality.findOne(conditions)
        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }
        let contacts: any = municipality.toObject().emergencyContacts ? municipality.toObject().emergencyContacts : []

        contacts.map((contact: any, index: any) => {
            if (index == req.body.oldIndex) {
                const data = contacts.splice(req.body.oldIndex, 1);
                contacts.splice(req.body.newIndex, 0, data[0]);
                return contact
            }
        });

        Municipality.findOneAndUpdate({ _id: municipality._id }, {
            $set: {
                emergencyContacts: contacts
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Contacts Rearranged', doc.emergencyContacts);
        });
    }

    async UsefulContactsList(req: express.Request, res: express.Response) {
        const conditions: any = { _id: req.auth.municipality._id }
        // if (req.query?.name) {
        //     conditions.title = { $regex: req.query.name, $options: "i" }
        // }

        let municipality: any = await Municipality.findOne(conditions)

        if (municipality == null) {
            return res.Error('Municipality not found')
        }

        res.Success('Contact list', municipality.toObject().usefulContacts ? municipality.toObject().usefulContacts.reverse() : [])
    }

    async UsefulContactsCategoryList(req: express.Request, res: express.Response) {
        const conditions: any = { _id: req.auth.municipality._id }

        let municipality: any = await Municipality.findOne(conditions)

        if (municipality == null) {
            return res.Error('Municipality not found')
        }

        let contactCategories = await ContactCategory.find();

        let usefulContact = municipality.toObject().usefulContacts

        let data = contactCategories.flatMap((doc: any) => {
            let contacts: Array<any> = []
            usefulContact.map((contact: any) => {
                if (contact?.category?._id.toString() === doc._id.toString()) {
                    delete contact.category
                    contacts.push(contact)
                }
            })
            let cat = doc.toObject()
            cat.contacts = contacts;

            if (contacts.length > 0) return cat
            else return []
        })

        res.Success('Contact list', data)
    }


    async DeleteEmergencyContacts(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'emergency-contact-images');
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),

        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        Municipality.findOneAndUpdate({ _id: req.auth.municipality._id }, {
            $pull:
            {
                "emergencyContacts": { _id: req.body._id }
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong", err);
            fs.unlink(storagePath + '/' + req.body._id + '.jpg', (err) => {
                console.log(err);
            })
            return res.Success('Contact Deleted');
        });


    }

    async DeleteUsefulContacts(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        Municipality.findOneAndUpdate({ _id: req.auth.municipality._id }, {
            $pull:
            {
                "usefulContacts": { _id: req.body._id }
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong", err);
            return res.Success('Contact Deleted');
        });

    }


    async UpdateEmergencyContacts(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'emergency-contact-images');
        const upload = multer({
            storage: multer.diskStorage({
                destination: storagePath,
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
                    callback(null, `${file.originalname}-${uniqueSuffix}`)
                }
            }),
            fileFilter: (req, file, callback) => {
                const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png'];

                if (allowedTypes.indexOf(file.mimetype) < 0) {
                    callback(new Error(`${file.mimetype} is not allowed`));
                } else {
                    callback(null, true);
                }
            }
        }).single('image')

        upload(req, res, async (err: any) => {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred when uploading.
                res.Error('Some error occured', err);
            } else if (err) {
                // An unknown error occurred when uploading.
                res.Error('Some error occured', err);
            } else {
                const schema = Joi.object().keys({
                    _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
                    titleEN: Joi.string().required(),
                    titleAL: Joi.string().required(),
                    contact: Joi.string().required(),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                let municipality: any = await Municipality.findOne({ _id: req.auth.municipality._id })

                if (municipality == null) {
                    return res.Error('User Not Found')
                }

                const contact: any = {
                    _id: req.body._id,
                    titleEN: req.body.titleEN,
                    titleAL: req.body.titleAL,
                    contact: req.body.contact
                };

                if (req.body.image) {
                    contact.image = req.body.image
                }

                const contactUpdate: any = {
                    "emergencyContacts.$.titleEN": contact.titleEN,
                    "emergencyContacts.$.titleAL": contact.titleAL,
                    "emergencyContacts.$.contact": contact.contact,
                }

                Municipality.findOneAndUpdate({ _id: req.auth.municipality._id, "emergencyContacts._id": req.body._id }, {
                    $set: contactUpdate
                }, { new: true }, (err: any, doc: any) => {
                    if (err || !doc) return res.Error("Something Went Wrong");
                    delete contact.image
                    contact.updatedAt = doc.updatedAt
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, contact._id + '.jpg'));
                    return res.Success('Contact Updated', contact);
                });
            }
        })
    }


    async UpdateUsefulContacts(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            titleEN: Joi.string().required(),
            titleAL: Joi.string().required(),
            contact: Joi.string().required(),
            categoryId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let municipality: any = await Municipality.findOne({ _id: req.auth.municipality._id })

        if (municipality == null) {
            return res.Error('Municipality Not Found')
        }

        let category: any = await ContactCategory.findOne({ _id: req.body.categoryId })

        if (category == null) {
            return res.Error('Contact Category Not Found')
        }

        let contact = {
            _id: req.body._id,
            titleEN: req.body.titleEN,
            titleAL: req.body.titleAL,
            contact: req.body.contact,
            category
        };

        Municipality.findOneAndUpdate({ _id: req.auth.municipality._id, "usefulContacts._id": req.body._id }, {
            $set: {
                "usefulContacts.$.titleEN": contact.titleEN,
                "usefulContacts.$.titleAL": contact.titleAL,
                "usefulContacts.$.contact": contact.contact,
                "usefulContacts.$.category": category
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something Went Wrong");
            return res.Success('Contact Updated', contact);
        });
    }
}







