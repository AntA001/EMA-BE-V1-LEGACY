import { SOSAdmin, healthSOSAdmin, policeSOSAdmin, fireSOSAdmin } from './../constants/municipalAdminTypes';
import express from "express"
import Joi, { ValidationError } from "joi"
import { smtptransporter } from "../configs/app.config";
import SosAlert from '../models/sosAlert'
import User from '../models/user'
import axios from 'axios';
import { AnyObject } from "mongoose";
import admin from "firebase-admin";
import Notification from '../models/notification';
import SmsLog from "../models/smsLog";
import Municipality from "../models/municipality";
import { sosAlertTypes } from '../constants/sosAlertTypes';

export class SosAlertController {
    private static instance: SosAlertController | null = null;

    private constructor() { }

    static init(): SosAlertController {
        if (this.instance == null) {
            this.instance = new SosAlertController()
        }

        return this.instance
    }

    async SosAlertList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        if (req.auth) {
            conditions["user.municipality._id"] = req.auth.municipality._id
        }

        if (req.query?.name) {
            conditions['user.name'] = { $regex: req.query.name, $options: "i" }
        }

        if (req.auth?.municipalAdminType) {
            let adminType = req.auth?.municipalAdminType
            if (adminType === healthSOSAdmin.type) {
                conditions['type'] = { $in: [sosAlertTypes.health, sosAlertTypes.test] }

            } else if (adminType === policeSOSAdmin.type) {
                conditions['type'] = { $in: [sosAlertTypes.police, sosAlertTypes.test] }

            } else if (adminType === fireSOSAdmin.type) {
                conditions['type'] = { $in: [sosAlertTypes.fire, sosAlertTypes.test] }
            }
        }

        let sosAlerts: any = await SosAlert.find(conditions).sort("-createdAt")
        res.Success("Sos Alerts", sosAlerts)
    }

    async ReadSOS(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        SosAlert.findByIdAndUpdate(req.body._id, { new: false }, (err: any, doc: any) => {
            if (err || doc == null) { res.Error('Something Went Wrong ') };
            res.Success('Sos Read')
        })
    }

    async SendSosAlert(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            lat: Joi.number().required(),
            lng: Joi.number().required(),
            type: Joi.string()
        })
        const { error, value } = schema.validate(req.body)
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message)
            return
        }

        const user: any = await User.findById(req.auth._id)

        if (user == null) {
            res.Error("User not found")
            return
        }

        const municipality: any = await Municipality.findById(req.auth.municipality._id)
        if (municipality == null) {
            res.Error('Municipality not Found');
            return
        }

        let municipalityObj = {
            _id: municipality._id,
            nameEN: municipality.nameEN,
            nameAL: municipality.nameAL
        }

        const sosAlert = await SosAlert.create({
            user: user,
            lat: req.body.lat,
            lng: req.body.lng,
            type: req.body.type ? req.body.type : null
        })

        await sosAlert.save().then(async (doc: any) => {
            res.Success("Sos Alert Sent")
            req.app.locals.io.to(String(municipality._id)).emit('sosAlert', doc)
            const users: any = await User.find({ "municipality._id": req.auth.municipality._id, userType: "municipal-admin" });
            let emails = users.flatMap((user: any) => user.email ? user.email : []);
            let phoneNumbers = users.flatMap((user: any) => user.phoneNo ? user.phoneNo : []);
            let fcmTokens: Array<any> = []

            let payload = {
                notification: {
                    title: "SOS Alert",
                    body: `From ${user.name}`,
                    sound: "default",
                },

                data: {
                    route: "notifications",
                },
            };

            let docs: Array<any> = [];
            let logs: Array<any> = [];
            let smsLogs: any

            users.map((user: any) => {
                docs.push({
                    sosAlert: doc,
                    municipality: municipalityObj,
                    sosAlertMsg: `SOS Alert From ${doc.user.name}`,
                    user: user._id
                })
                logs.push({
                    sosAlert: sosAlert._id,
                    user: user._id,
                    phoneNo: user.phoneNo
                })
            })

            if (doc.type != 'test') {

                let remainingSms = municipality.maxSmsCount - municipality.smsCount - municipality.inProgressSms;

                if (remainingSms >= users.length) {
                    if (phoneNumbers.length > 0) {
                        let data = {
                            "message": `SOS Alert \nFrom ${user.name} \nType of emergency: ${doc.type}\nMunicipality: ${municipality.nameEN}`,
                            "to": phoneNumbers,
                            "sender_id": "EMA",
                            "callback_url": `${process.env.BASE_URL}/api/public/sms/report`
                        }
                        axios.post(`${process.env.SMS_API_BASE_URL}/sms/send`, data, {
                            headers: {
                                'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }).then(async function (response: any) {
                            console.log('Sms Success Data', response.data);
                            if (response.data.success) {
                                await Municipality.findByIdAndUpdate(municipality._id, { inProgressSms: municipality.inProgressSms + users.length })
                                logs.map((log: any, index: number) => {
                                    logs[index].trackingId = response.data.campaign_id;
                                    logs[index].municipality = req.auth.municipality._id;
                                })

                                smsLogs = SmsLog.create(logs);
                                smsLogs.save().then((doc: any) => { }).catch(() => {
                                    console.log('error')
                                });
                            }
                        })
                            .catch(function (error: any) {
                                console.log(error);
                            });

                    }
                }
            }

            if (user.personalEmergencyContacts.length > 0) {
                let personalContacts: any = user.toObject().personalEmergencyContacts
                let personalContactNumbers = personalContacts.flatMap((user: any) => user.contact ? user.contact : []);
                // personalContacts = personalContacts.flatMap((user: any) => user.contact ? user.contact : []);
                // phoneNumbers = phoneNumbers.concat(personalContacts)
                const users = await User.find({ phoneNo: { $in: personalContactNumbers } }, { name: 1, fcmToken: 1 });
                fcmTokens = users.flatMap((user: any) => user.fcmToken ? user.fcmToken : []);
                users.map((user: any) => {
                    docs.push({
                        sosAlert: doc,
                        sosAlertMsg: `SOS Alert From ${doc.user.name}`,
                        municipality: municipalityObj,
                        user: user._id
                    })
                })
                if (fcmTokens.length !== 0) {
                    admin
                        .messaging()
                        .sendToDevice(fcmTokens, payload)
                        .then(function (response: any) { })
                        .catch(function (error: any) {
                            console.log("Error sending message", error);
                        });
                }
            }

            if (emails.length > 0) {
                var mailOptions = {
                    from: process.env.MAIL_FROM_ADDRESS,
                    to: emails,
                    subject: doc.title,
                    html: `<div style="width:500px"><h1>SOS Alert</h1><p style="font-size: 16px">From ${user.name}</p></div>`,
                    // attachments: [
                    //     {
                    //         filename: "logo.png",
                    //         path: "./imgs/logo.png",
                    //         cid: "logo", //same cid value as in the html img src
                    //     },
                    // ],
                };
                smtptransporter.sendMail(mailOptions, function (err: any, info: any) {
                    if (err) return console.log("Something went wrong", err);
                    // res.Success("Email Successfully Sent");
                    console.log(info)
                });


            }

            if (docs.length > 0) {
                const notifications: any = await Notification.create(docs)
                notifications.save().then((doc: any) => { }).catch(() => {
                    console.log('error')
                })
            }

        }).catch((err: any) => {
            console.log(err)
            // res.Error("Something Went Wrong");
        })

    }

}
