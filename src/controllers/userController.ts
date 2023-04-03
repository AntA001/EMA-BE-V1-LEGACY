import { generalAdmin, municipalAdminTypes } from './../constants/municipalAdminTypes';
import express from "express"
import Joi, { ValidationError } from "joi"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import Category from '../models/category'
import User from '../models/user'
import Municipality from '../models/municipality'
import { dir } from '../../path'
import Notification from '../models/notification'
import multer from 'multer'
import path from 'path';
import fs from 'fs'
import moment from 'moment'
import AuthToken from '../models/authToken';



export class UserController {
    private static instance: UserController | null = null;

    private constructor() { }

    static init(): UserController {
        if (this.instance == null) {
            this.instance = new UserController()
        }

        return this.instance
    }


    async MunicipalAdminTypeList(req: express.Request, res: express.Response) {
        res.Success('MunicipalAdminTypeList', municipalAdminTypes)
    }

    async UpdateMunicipalAdmin(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            name: Joi.string()
                .regex(/^[a-zA-Z ]+$/)
                .required()
                .min(3)
                .max(50),
            email: Joi.string().email().allow(null),
            phone_no: Joi.string().required().max(20),
            municipality_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            municipal_admin_type: Joi.string().required(),
            fcm_token: Joi.string(),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }


        var emailCheck = req.body.email.includes('hotmail') || req.body.email.split('@')[0].includes('.');

        if (emailCheck) {
            return res.Error('email is invalid', emailCheck);
        }

        const municipality: any = await Municipality.findById(req.body.municipality_id);

        if (municipality == null) {
            res.Error("Municipality Not Found")
            return
        }

        const admin: any = await User.findById(req.body._id);


        if (admin == null) {
            res.Error("This municipal-admin does'nt exists")
            return
        }

        User.findByIdAndUpdate(admin._id, {
            name: req.body.name,
            phoneNo: req.body.phone_no,
            email: req.body.email ? req.body.email : null,
            municipality: municipality,
            municipalAdminType: req.body.municipal_admin_type,
            fcmToken: req.body.fcm_token ? req.body.fcm_token : admin?.fcmToken ? admin?.fcmToken : null,
        }, { new: true }, async (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)
            await AuthToken.findOneAndDelete({ user: doc._id })
            let userData = doc.toObject();
            delete userData?.password
            delete userData?.municipality?.emergencyContacts
            delete userData?.municipality?.usefulContacts
            delete userData?.image
            res.Success("Municipal Admin Updated", { ...userData });
        })


    }

    async UpdateMunicipalAdminStatus(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            status: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        User.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something went wrong", err)
            res.Success("Municipal Admin Status Updated", doc);
        })

    }


    async AddMunicipalAdmin(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().allow(null),
            name: Joi.string().required()
                .min(3)
                .max(50),
            email: Joi.string().email().allow(null),
            password: Joi.string().min(6),
            confirm_password: Joi.string().min(6),
            phone_no: Joi.string().required().max(20),
            municipal_admin_type: Joi.string().required(),
            municipality_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            fcm_token: Joi.string(),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        if (req.body.password !== req.body.confirm_password) {
            res.Error("password and confirm password does'nt match")
            return
        }


        var emailCheck = req.body.email.includes('hotmail') || req.body.email.split('@')[0].includes('.');

        if (emailCheck) {
            return res.Error('email is invalid', emailCheck);
        }



        const municipality: any = await Municipality.findById(req.body.municipality_id);

        if (municipality == null) {
            res.Error("Municipality Not Found")
            return
        }


        const admins: any = await User.count({ "municipality._id": req.body.municipality_id, userType: 'municipal-admin' })

        if (admins >= 5) {
            res.Error("Number of municipal admin for this municipality is maxed out. You can only add upto 5.")
            return
        }

        else {

            const admin: any = await User.findOne({ phoneNo: req.body.phone_no, "municipality._id": req.body.municipality_id, userType: 'municipal-admin' });


            if (admin != null) {
                res.Error("This municipal-admin already exists")
                return
            }

            const user: any = await User.create({
                name: req.body.name,
                phoneNo: req.body.phone_no,
                email: req.body.email ? req.body.email : null,
                password: bcrypt.hashSync(req.body.password, 8),
                municipality: municipality,
                userType: 'municipal-admin',
                municipalAdminType: req.body.municipal_admin_type,
                fcmToken: req.body.fcm_token ? req.body.fcm_token : null,
            })
            await user.save().then((doc: any) => {
                let userData = doc.toObject();
                delete userData?.municipality?.emergencyContacts
                delete userData?.municipality?.usefulContacts
                delete userData?.image
                res.Success("Municipal Admin Added", { ...userData });
            }).catch(() => {
                res.Error("Something Went Wrong");
            })
        }
    }

    async DeleteMunicipalAdmin(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        User.findByIdAndRemove(req.body._id, (err: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Municipal Admin Deleted');
        })
    }

    async MunicipalAdminList(req: express.Request, res: express.Response) {
        const conditions: any = { userType: 'municipal-admin' }

        if (req.query?.name) {
            conditions.name = { $regex: req.query.name, $options: "i" }
        }

        let municipalAdmins: any = await User.find(conditions, {
            personalEmergencyContacts: 0,
            "municipality.emergencyContacts": 0,
            "municipality.usefulContacts": 0,
            "municipality.locationCategories": 0,
            image: 0,
        });
        res.Success("Municipality Admins", municipalAdmins)
    }





    async SavePersonalDetails(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            name: Joi.string()
                .required()
                .min(3)
                .max(50),
            email: Joi.string().email().allow(null),
            password: Joi.string().required().min(6),
            fcm_token: Joi.string(),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({ _id: req.auth._id })


        if (user == null) {
            res.Error("User Not Found")
            return
        }

        if (req.body.email) {
            const userEmail: any = await User.findOne({ email: req.body.email })
            if (userEmail != null) {
                res.Error("Email already used By another user.")
                return
            }
        }


        User.findByIdAndUpdate(user._id, {
            name: req.body.name,
            email: req.body.email ? req.body.email : null,
            password: bcrypt.hashSync(req.body.password, 8),
            fcmToken: req.body.fcm_token ? req.body.fcm_token : null,
            step: 2,
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)
            return res.Success('Personal details saved', doc)
        })


    }

    async UpdateMunicipality(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string()
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            res.Error("User Not Found")
            return
        }

        const municipality: any = await Municipality.findOne({ _id: req.body._id })

        if (municipality == null) {
            res.Error("Municipality Not Found")
            return
        }


        User.findByIdAndUpdate(user._id, {
            municipality: municipality
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong")
            let userData: any = doc.toObject()
            delete userData.personalEmergencyContacts
            delete userData.municipality.emergencyContacts
            delete userData.municipality.usefulContacts
            delete userData?.image
            const secret = process.env.ACCESS_TOKEN_SECRET
                ? process.env.ACCESS_TOKEN_SECRET
                : ""
            const token = jwt.sign(userData, secret, {
                expiresIn: 86400 * 15,
            })
            userData = doc.toObject()
            delete userData.municipality.emergencyContacts
            delete userData.municipality.usefulContacts
            delete userData?.image

            return res.Success('Municipality Updated', { token, ...userData })

        })
    }

    async UpdateUserCategory(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string()
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            res.Error("User Not Found")
            return
        }

        const userCategory: any = await Category.findOne({ _id: req.body._id })

        if (userCategory == null) {
            res.Error("Municipality Not Found")
            return
        }


        User.findByIdAndUpdate(user._id, {
            category: userCategory
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong")
            let userData: any = doc.toObject()
            delete userData.personalEmergencyContacts
            delete userData.municipality.emergencyContacts
            delete userData.municipality.usefulContacts
            delete userData?.image
            const secret = process.env.ACCESS_TOKEN_SECRET
                ? process.env.ACCESS_TOKEN_SECRET
                : ""
            const token = jwt.sign(userData, secret, {
                expiresIn: 86400 * 15,
            })
            userData = doc.toObject()
            delete userData.municipality.emergencyContacts
            delete userData.municipality.usefulContacts
            delete userData?.image

            return res.Success('User Category Updated', { token, ...userData })

        })
    }


    async SaveProfileImage(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            image: Joi.string(),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            res.Error("User Not Found")
            return
        }

        User.findByIdAndUpdate(user._id, {
            image: req.body.image ? req.body.image : null,
            step: user.step > 3 ? user.step : 3
        }, (err: any) => {
            if (err) return res.Error("Something Went Wrong")
            return res.Success('Picture Updated')
        })
    }


    async UploadProfileImage(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'profile-images');
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
                const user: any = await User.findOne({ _id: req.auth._id })
                if (user == null) {
                    res.Error("User Not Found")
                    return
                }
                User.findByIdAndUpdate(user._id, {
                    step: user.step > 3 ? user.step : 3
                }, (err: any, doc: any) => {
                    if (err) return res.Error("Something Went Wrong")
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    return res.Success('Picture Updated')
                })
            }
        })
    }


    async SaveMunicipalDetails(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            category_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            municipality_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            fcm_token: Joi.string()
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            res.Error("User Not Found")
            return
        }
        const category: any = await Category.findById(req.body.category_id)
        const municipality: any = await Municipality.findById(req.body.municipality_id)

        if (category == null) {
            res.Error("Catergory Not Found")
            return
        }

        if (municipality == null) {
            res.Error("Municipality Not Found")
            return
        }

        User.findByIdAndUpdate(user._id, {
            category: category,
            municipality: municipality,
            fcmToken: req.body.fcm_token ? req.body.fcm_token : null,
            step: 4
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)

            let userData: any = doc.toObject()
            delete userData?.personalEmergencyContacts
            delete userData?.municipality?.emergencyContacts
            delete userData?.municipality?.usefulContacts
            delete userData?.municipality?.locationCategories
            delete userData?.image
            const secret = process.env.ACCESS_TOKEN_SECRET
                ? process.env.ACCESS_TOKEN_SECRET
                : ""
            const token = jwt.sign(userData, secret, {
                expiresIn: 86400 * 15,
            })

            userData = doc.toObject()
            delete userData?.municipality?.emergencyContacts
            delete userData?.municipality?.usefulContacts
            delete userData?.municipality?.locationCategories
            delete userData?.image

            res.Success("Sign Successful", { token, ...userData })

        })

    }


    async AddPersonalEmergencyContacts(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            title: Joi.string().required(),
            contact: Joi.string().required(),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        let user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            return res.Error('User Not Found')
        }

        let contact = { title: req.body.title, contact: req.body.contact }

        User.findOneAndUpdate({ _id: user._id }, {
            $push: {
                personalEmergencyContacts: contact
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong")
            return res.Success('Contact Added', doc.personalEmergencyContacts[doc.personalEmergencyContacts.length - 1])
        })
    }


    async UpdatePersonalEmergencyContacts(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
            title: Joi.string().required(),
            contact: Joi.string().required(),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        let user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            return res.Error('User Not Found')
        }

        let contact = { _id: req.body._id, title: req.body.title, contact: req.body.contact }

        User.findOneAndUpdate({ _id: req.auth._id, "personalEmergencyContacts._id": req.body._id }, {
            $set: {
                "personalEmergencyContacts.$.title": contact.title,
                "personalEmergencyContacts.$.contact": contact.contact
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err || !doc) return res.Error("Something Went Wrong")
            return res.Success('Contact Added', contact)
        })
    }


    async PersonalEmergencyContactsList(req: express.Request, res: express.Response) {
        let user: any = await User.findOne({ _id: req.auth._id })

        if (user == null) {
            return res.Error('User Not Found')
        }

        res.Success('Contact list', user.toObject().personalEmergencyContacts ? user.toObject().personalEmergencyContacts : [])
    }

    async DeletePersonalEmergencyContacts(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        User.findOneAndUpdate({ _id: req.auth._id }, {
            $pull:
            {
                "personalEmergencyContacts": { _id: req.body._id }
            }
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong", err)
            return res.Success('Contact Deleted')
        })
    }


    async UserProfileImage(req: express.Request, res: express.Response) {
        const conditions: any = {}
        if (req.params?.id && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            conditions._id = req.params.id
        }
        else {
            res.sendFile(dir + "/storage/images/no-user-image.jpg")
            return
        }

        let image: any = await User.findOne(conditions).select('image')

        if (image?.image != null && image?.image.length > 0 && image.image) {
            var base64Data = image.image.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '')
            var img = Buffer.from(base64Data, 'base64')
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            })
            res.end(img)
            return
        } else {
            res.sendFile(dir + "/storage/images/no-user-image.jpg")
            return
        }
    }


    async ProfileImage(req: express.Request, res: express.Response) {
        const dir = path.resolve('./', 'storage', 'images');
        const storagePath = path.resolve('./', 'storage', 'profile-images');
        if (req.params.id) {
            let id = req.params.id.toString()
            res.sendFile(storagePath + '/' + id + '.jpg', err => {
                if (err)
                    res.sendFile(dir + "/no-user-image.jpg")
            })
        }
        else {
            res.sendFile(dir + "/no-user-image.jpg")
        }
    }

    async NotificationList(req: express.Request, res: express.Response) {
        if (!req.auth) {
            res.Error('Something Went Wrong');
        }
        const notifications = await Notification.find({ user: req.auth._id }).populate("sosAlert", "lat lng type").sort("-createdAt");

        res.Success("Notifications", notifications)

        Notification.updateMany({ user: req.auth._id, isRead: false }, { isRead: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong")
            // return res.Success('Profile Updated', userData)
        })
    }

    async NotificationCount(req: express.Request, res: express.Response) {
        if (!req.auth) {
            res.Error('Something Went Wrong');
        }
        const notifications = await Notification.find({ user: req.auth._id, isRead: false });
        res.Success("Notifications Count", notifications.length)
    }

    async UpdateUserData(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            lastUpdated: Joi.string()
                .required()
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({
            _id: req.auth._id,
        }).select("-personalEmergencyContacts").lean()

        delete user.municipality.emergencyContacts
        delete user.municipality.usefulContacts
        delete user?.image

        if (user?.updatedAt && req.body.lastUpdated != 'null') {
            if (moment(user.updatedAt).isAfter(req.body.lastUpdated)) {
                res.Success("User Details", user)
                return
            }
            else {
                res.Error("Already latest")
                return
            }
        }
        else {
            User.findByIdAndUpdate(user._id, { status: user.status }, { new: true }, (err: any, doc: any) => {
                delete doc.municipality.emergencyContacts
                delete doc.municipality.usefulContacts
                delete doc?.image
                res.Success("User Details", doc)
                return
            })
        }
    }

    async UpdateUserProfile(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            name: Joi.string()
                .required()
                .min(3)
                .max(50),
            image: Joi.string().allow(null),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findOne({
            _id: req.auth._id,
        })

        if (user === null) {
            res.Error("User not found.")
            return
        }
        const updateData: any = {
            name: req.body.name
        }
        if (req.body.image) {
            updateData.image = req.body.image
        }
        User.findByIdAndUpdate(user._id, updateData, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something Went Wrong")
            let userData = doc.toObject()
            delete userData.municipality.emergencyContacts
            delete userData.municipality.usefulContacts
            delete userData?.image
            return res.Success('Profile Updated', userData)
        })
    }

    async CopyImagesToStorage(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'profile-images');

        let id: any = req.query?.id;
        if (id === '1122') {
            let articles = await User.find();
            articles.map((article: any) => {

                if (article?.image) {
                    var base64Data = article.image.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '')
                    fs.writeFile(storagePath + '/' + article._id + '.jpg', base64Data, 'base64', function (err: any) {
                        console.log('ewqeqw', err);
                    });
                    console.log(storagePath + '/' + article._id + '.jpg');

                }
            })
        }

    }


    async UpdateUserProfileDetails(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'profile-images');
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
                    name: Joi.string()
                        .required()
                        .min(3)
                        .max(50),
                })
                const { error, value } = schema.validate(req.body)
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message)
                    return
                }

                const user: any = await User.findOne({
                    _id: req.auth._id,
                })

                if (user === null) {
                    res.Error("User not found.")
                    return
                }

                const updateData: any = {
                    name: req.body.name
                }
                if (req.body.image) {
                    updateData.image = req.body.image
                }

                User.findByIdAndUpdate(user._id, updateData, { new: true }, (err: any, doc: any) => {
                    if (err) return res.Error("Something Went Wrong")
                    let userData = doc.toObject()
                    delete userData.municipality.emergencyContacts
                    delete userData.municipality.usefulContacts
                    delete userData?.image
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    return res.Success('Profile Updated', userData)
                })
            }
        })


    }

    async userList(req: express.Request, res: express.Response) {
        const conditions: any = { "municipality._id": req.auth.municipality._id, userType: "user" };
        if (req.query?.name) {
            conditions.name = { $regex: req.query.name, $options: "i" }
        }
        if (req.query?.category_id) {
            let category_id = req.query.category_id.toString()
            if (category_id.match(/^[0-9a-fA-F]{24}$/)) {
                conditions["category._id"] = category_id;
            }
            else {
                if (category_id != 'null') {
                    res.Error('Invalid category id pattren or no id given')
                    return
                }
            }
        }
        let users: any = await User.find(conditions).select("-image -municipality -personalEmergencyContacts -fcmToken -step -password -userType -lastLogin -status")
        res.Success('User list', users)
    }

}
