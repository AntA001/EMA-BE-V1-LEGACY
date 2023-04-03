import { smtptransporter } from './../configs/app.config';
import moment from 'moment';
import bcrypt from "bcryptjs";
import express, { response } from "express";
import jwt from "jsonwebtoken";
import Joi, { ValidationError } from "joi";
import User from '../models/user';
import VerificationCode from '../models/verificationCodes';
import axios from 'axios';
import AuthToken from '../models/authToken';

export class AuthController {
    private static instance: AuthController | null = null;

    private constructor() { }

    static init(): AuthController {
        if (this.instance == null) {
            this.instance = new AuthController();
        }

        return this.instance;
    }


    async SendVerificationCode(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            phone_no: Joi.string().required().max(20),
            disable_sms: Joi.boolean()
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let verificationCode = await VerificationCode.findOne({ phoneNo: req.body.phone_no, type: 'otp' });

        const user: any = await User.findOne({ phoneNo: req.body.phone_no }, {
            "municipality.emergencyContacts": 0,
            "municipality.usefulContacts": 0,
            "municipality.locationCategories": 0,
            personalEmergencyContacts: 0,
            image: 0,
        })

        if (!user && req.body?.disable_sms) {
            return res.Error('Number of tries exceeded please make sure you are using the correct phone number and try again in 24 hours')
        }


        if (verificationCode && !user) {
            let code = Math.floor(100000 + Math.random() * 900000);
            let expiry = moment().add(5, 'minutes')
            VerificationCode.findByIdAndUpdate(verificationCode._id, {
                code: code,
                expiry: expiry,
            }, { new: true }, (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                let phoneNumber = req.body.phone_no ? req.body.phone_no : null;
                if (phoneNumber) {
                    var data = {
                        "message": "Dear Customer, Your OTP is " + doc.code + " . Use this Passcode to complete process. Thank you.",
                        "to": [phoneNumber],
                        "sender_id": "EMA",
                        //"callback_url": "https://example.com/callback/handler"
                    }


                    axios.post(`${process.env.SMS_API_BASE_URL}/sms/send`, data, {
                        headers: {
                            'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(function (response: any) {
                        console.log('Sms Success Data', response.data);
                    })
                        .catch(function (error: any) {
                            console.log(error);
                        });
                }

                return res.Success('OTP Code', doc.code);
            })
        }
        else if (user) {
            const secret = process.env.ACCESS_TOKEN_SECRET
                ? process.env.ACCESS_TOKEN_SECRET
                : "";
            const token = jwt.sign(user.toJSON(), secret, {
                expiresIn: 86400 * 15,
            });

            res.Success("Phone Number Already Verified", {
                step: user.step, token: user.step < 4 ? token : null
            });

        }
        else {
            let code = Math.floor(100000 + Math.random() * 900000);
            let expiry = moment().add(5, 'minutes')
            const addVerficationCode = await VerificationCode.create({
                phoneNo: req.body.phone_no,
                code: code,
                expiry: expiry
            })
            await addVerficationCode.save().then((doc: any) => {
                let phoneNumber = req.body.phone_no ? req.body.phone_no : null;
                if (phoneNumber) {
                    var data = {
                        "message": "Dear Customer, Your OTP is " + doc.code + " . Use this Passcode to complete process. Thank you.",
                        "to": [phoneNumber],
                        "sender_id": "EMA",
                        //"callback_url": "https://example.com/callback/handler"
                    }


                    axios.post(`${process.env.SMS_API_BASE_URL}/sms/send`, data, {
                        headers: {
                            'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(function (response: any) {
                        console.log('Sms Success Data', response.data);
                    })
                        .catch(function (error: any) {
                            console.log(error);
                        });
                }

                res.Success("OTP Code", doc.code);
            }).catch(() => {
                res.Error("Something Went Wrong");
            })
        }

    }


    async VerifyCode(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            phone_no: Joi.string().required().max(20),
            code: Joi.number().required()
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const verificationCode: any = await VerificationCode.findOne({ phoneNo: req.body.phone_no, code: req.body.code, type: 'otp' });

        if (verificationCode) {
            if (moment(verificationCode.expiry).isAfter(moment())) {
                const user: any = await User.create({
                    phoneNo: req.body.phone_no,
                    step: 1,
                })
                await user.save().then(async (doc: any) => {
                    const secret = process.env.ACCESS_TOKEN_SECRET
                        ? process.env.ACCESS_TOKEN_SECRET
                        : "";
                    const token = jwt.sign(doc.toJSON(), secret, {
                        expiresIn: 86400 * 15,
                    });

                    VerificationCode.deleteOne({ id: verificationCode }, (err: any) => {
                        if (err) return res.Error("Something Went Wrong");
                        res.Success("Phone Number Verified", { token });
                    });
                }).catch(() => {
                    res.Error("Something Went Wrong");
                })
            }
            else {
                res.Error("Code Expired or Invalid");

            }
        }
        else {
            res.Error("Code Expired or Invalid");

        }
    }

    async CheckSignIn(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            fcm_token: Joi.string().allow(null),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const user: any = await User.findOne({
            _id: req.auth._id
        });


        if (user == null) {
            res.Error("Invalid Token");
            return;
        }

        if ((user?.fcmToken && user?.fcmToken === req.body.fcm_token) || !user?.fcmToken) {
            res.Success('Logged in')
        }
        else {
            res.Error('Logged in another device')
        }
    }


    async SignIn(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            email: Joi.string().required(),
            password: Joi.string().required().min(3),
            fcm_token: Joi.string().allow(null),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        const user: any = await User.findOne({ $or: [{ phoneNo: req.body.email }, { email: req.body.email }] }, {
            "municipality.emergencyContacts": 0,
            "municipality.usefulContacts": 0,
            "municipality.locationCategories": 0,
            image: 0,
        });


        if (user == null) {
            res.Error("Invalid Phone No or Email");
            return;
        }

        if (user?.status === 'inactive') {
            res.Error("User in disabled");
            return;
        }


        if (bcrypt.compareSync(req.body.password, user.password)) {
            const secret = process.env.ACCESS_TOKEN_SECRET
                ? process.env.ACCESS_TOKEN_SECRET
                : "";
            const userData: any = user.toObject();
            delete userData.personalEmergencyContacts
            const token = jwt.sign(userData, secret, {
                expiresIn: 86400 * 15,
            });
            User.findByIdAndUpdate(user._id, {
                lastLogin: moment(),
                fcmToken: req.body.fcm_token ? req.body.fcm_token : user?.fcmToken ? user?.fcmToken : null,
            }, { new: true }, async (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                if (doc.userType === 'municipal-admin') {
                    let authToken = await AuthToken.findOne({ user: doc._id });
                    if (authToken) {
                        await AuthToken.findByIdAndUpdate(authToken._id, { token: token })
                    }
                    else {
                        let saveToken = await AuthToken.create({ user: doc._id, token: token })
                        await saveToken.save()
                    }
                }
                let userData = doc.toObject();
                delete userData?.municipality?.emergencyContacts
                delete userData?.municipality?.usefulContacts
                delete userData?.image
                delete userData?.municipality?.locationCategories
                res.Success("Login Successful", { token, ...userData });
            })
        } else {
            return res.Error("Invalid password");
        }
    }


    async ForgotPassword(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            email: Joi.string().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }



        const user: any = await User.findOne({ $or: [{ phoneNo: req.body.email }, { email: req.body.email }] });


        if (user == null) {
            res.Error("Invalid Phone No or Email");
            return;
        }


        let verificationCode = await VerificationCode.findOne({ "user._id": user._id, type: 'reset' });

        let code = Math.floor(100000 + Math.random() * 900000);
        let expiry = moment().add(10, 'minutes')



        if (verificationCode) {
            VerificationCode.findByIdAndUpdate(verificationCode._id, {
                code: code,
                expiry: expiry,
            }, { new: true }, (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                res.Success("Code Successfully Sent");
                var mailOptions = {
                    from: process.env.MAIL_FROM_ADDRESS,
                    to: user.email,
                    subject: "Account Password Reset",
                    html: `<div style="width:500px"><h1>${user.name}, Use this Passcode to Reset Password:</h1><p style="font-size: 16px">${doc.code}</p></div>`,
                    // attachments: [
                    //     {
                    //         filename: "logo.png",
                    //         path: "./imgs/logo.png",
                    //         cid: "logo", //same cid value as in the html img src
                    //     },
                    // ],
                };

                if (user.email) {
                    smtptransporter.sendMail(mailOptions, function (err: any, info: any) {
                        if (err) console.log(err)
                        console.log(info)
                    });
                }


                let phoneNumber = user.phoneNo ? user.phoneNo : null;
                if (phoneNumber) {
                    var data = {
                        "message": "Dear Customer, Your OTP is " + doc.code + " . Use this Passcode to Reset Password.",
                        "to": [phoneNumber],
                        "sender_id": "EMA",
                        //"callback_url": "https://example.com/callback/handler"
                    }

                    axios.post(`${process.env.SMS_API_BASE_URL}/sms/send`, data, {
                        headers: {
                            'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(function (response: any) {
                        console.log('Sms Success Data', response.data);
                    })
                        .catch(function (error: any) {
                            console.log(error);
                        });
                }


            })
        } else {
            const addVerficationCode = await VerificationCode.create({
                phoneNo: user.phoneNo,
                code: code,
                expiry: expiry,
                type: 'reset',
                user: user
            })
            await addVerficationCode.save().then((doc: any) => {
                res.Success("Code Successfully Sent", doc.code);
                var mailOptions = {
                    from: process.env.MAIL_FROM_ADDRESS,
                    to: user.email,
                    subject: "Account Password Reset",
                    html: `<div style="width:500px"><h1>${user.name}, Use this Passcode to Reset Password: </h1><p style="font-size: 16px">${doc.code}</p></div>`,
                    // attachments: [
                    //     {
                    //         filename: "logo.png",
                    //         path: "./imgs/logo.png",
                    //         cid: "logo", //same cid value as in the html img src
                    //     },
                    // ],
                };


                if (user.email) {
                    smtptransporter.sendMail(mailOptions, function (err: any, info: any) {
                        if (err) console.log(err)
                        console.log(info)
                    });
                }


                let phoneNumber = user.phoneNo ? user.phoneNo : null;
                if (phoneNumber) {
                    var data = {
                        "message": "Dear Customer, Your OTP is " + doc.code + " . Use this Passcode to Reset Password.",
                        "to": [phoneNumber],
                        "sender_id": "EMA",
                        //"callback_url": "https://example.com/callback/handler"
                    }

                    axios.post(`${process.env.SMS_API_BASE_URL}/sms/send`, data, {
                        headers: {
                            'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(function (response: any) {
                        console.log('Sms Success Data', response.data);
                    })
                        .catch(function (error: any) {
                            console.log(error);
                        });
                }

            }).catch(() => {
                res.Error("Something Went Wrong");
            })

        }

    }

    async ResetPassword(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            reset_code: Joi.number().required(),
            password: Joi.string().min(3).required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        let verificationCode = await VerificationCode.findOne({ code: req.body.reset_code, type: 'reset' });

        if (verificationCode == null) {
            res.Error("Reset Code Expired or Used");
            return;
        }
        if (verificationCode != null && moment().isAfter(moment(verificationCode.expiry))) {
            res.Error("Reset Code Expired or Used");
            return;
        }

        if (verificationCode?.user) {
            User.findByIdAndUpdate(verificationCode.user._id, {
                password: bcrypt.hashSync(req.body.password, 8),
            }, { new: true }, (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                VerificationCode.deleteOne({ _id: verificationCode._id }, (err: any) => {
                    if (err) return res.Error("Something Went Wrong");
                    return res.Success('Password Successfully Changed');
                })
            })
        }
        else {
            res.Error("Something Went Wrong");
        }
    }


    async ChangePassword(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            old_password: Joi.string().min(3).required(),
            password: Joi.string().min(3).required(),
            confirmation_password: Joi.string().min(3).required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        if (req.body.password !== req.body.confirmation_password) {
            res.Error("password and confirm password doesn't match.");
            return;
        }
        const user: any = await User.findById(req.auth._id, {
            "municipality.emergencyContacts": 0,
            "municipality.usefulContacts": 0,
            image: 0,
        });


        if (user == null) {
            res.Error("Invalid Phone No or Email");
            return;
        }


        if (bcrypt.compareSync(req.body.old_password, user.password)) {
            User.findByIdAndUpdate(user._id, {
                password: bcrypt.hashSync(req.body.password, 8),
            }, { new: true }, (err: any, doc: any) => {
                if (err) return res.Error("Something went wrong", err);
                return res.Success('Password Successfully Changed');
            })
        }
        else {
            return res.Error("old Password not valid")
        }

    }

    async SignOut(req: express.Request, res: express.Response) {
        User.findByIdAndUpdate(req.auth._id, {
            fcmToken: ""
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)
            res.Success("Log Out Successfully", doc);
        })
    }
}