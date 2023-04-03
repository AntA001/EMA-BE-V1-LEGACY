import { smtptransporter } from './../configs/app.config';
import express from "express";
import Joi, { ValidationError } from "joi";
import BroadcastMessage from '../models/broadcastMessage';
import Category from '../models/category';
import Notification from '../models/notification';
import User from '../models/user';
import admin from "firebase-admin";
import axios from "axios";
import SmsLog from '../models/smsLog';
import Municipality from '../models/municipality';


export class BroadcastMessageController {
    private static instance: BroadcastMessageController | null = null;

    private constructor() { }

    static init(): BroadcastMessageController {
        if (this.instance == null) {
            this.instance = new BroadcastMessageController();
        }

        return this.instance;
    }

    async BroadcastMessageList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        if (req.auth) {
            conditions.municipality = req.auth.municipality._id;
        }

        if (req.query?.name) {
            conditions.title = { $regex: req.query.name, $options: "i" }
        }

        let broadcastMessage: any = await BroadcastMessage.find(conditions).sort("-createdAt");
        res.Success("Broadcast Messages", broadcastMessage)
    }

    async SendBroadcastMessage(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.allow(null),
            category_id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/).allow(''),
            title: Joi.string().required(),
            message: Joi.string().required(),
            notification: Joi.boolean().required(),
            sms: Joi.boolean().required(),
            template: Joi.boolean().required(),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        let category: any = null
        if (req.body.category_id != '') {
            category = await Category.findById(req.body.category_id);

            if (category == null) {
                res.Error('Categroy not Found');
                return
            }
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

        const sender = {
            _id: req.auth._id,
            name: req.auth.name,
            email: req.auth.email
        }

        const broadcastMessage = await BroadcastMessage.create({
            category: category,
            title: req.body.title,
            message: req.body.message,
            notification: req.body.notification,
            sms: req.body.sms,
            template: req.body.template,
            municipality: municipality._id,
            sender: sender,
        })

        const userConditions: any = { "municipality._id": municipality._id }
        if (req.body.category_id != '') {
            userConditions["category._id"] = req.body.category_id
        }
        const users = await User.find(userConditions);

        if (req.body.sms) {
            let remainingSms = municipality.maxSmsCount - municipality.smsCount - municipality.inProgressSms;

            if (users.length > remainingSms) {
                res.Error('SMS limit exceeds if broadcast message sent. Remaining Limit: ' + String(remainingSms))
                return
            }
        }

        broadcastMessage.save().then(async (doc: any) => {
            var payload = {
                notification: {
                    title: doc.title,
                    body: doc.message,
                    sound: "default",
                },
                data: {
                    route: "notifications"
                },
            };
            if (doc.sms) {
                await Municipality.findByIdAndUpdate(municipality._id, { inProgressSms: municipality.inProgressSms + users.length })
            }

            res.Success("Broadcast Message Sent", doc);
            let emails = users.flatMap((user: any) => user.email ? user.email : []);
            let phoneNumbers = users.flatMap((user: any) => user.phoneNo ? user.phoneNo : []);
            let fcmTokens = users.flatMap((user: any) => user.fcmToken ? user.fcmToken : []);

            if (users.length > 0) {
                let docs: Array<any> = [];
                let logs: Array<any> = [];

                users.map((user: any) => {
                    docs.push({
                        broadcastMessage: doc,
                        user: user._id,
                        municipality: municipalityObj
                    })
                    logs.push({
                        broadcastMessage: doc._id,
                        user: user._id,
                        phoneNo: user.phoneNo
                    })
                })
                const notifications: any = await Notification.create(docs)
                let smsLogs: any

                if (fcmTokens.length !== 0 && doc.notification) {
                    admin
                        .messaging()
                        .sendToDevice(fcmTokens, payload)
                        .then(function (response: any) { })
                        .catch(function (error: any) {
                            console.log("Error sending message", error);
                        });
                }
                if (phoneNumbers.length !== 0 && doc.sms) {

                    let data = {
                        "message": doc.title + '\n' + doc.message,
                        "to": phoneNumbers,
                        "sender_id": "EMA",
                        "callback_url": `${process.env.BASE_URL}/api/public/sms/report`
                    }

                    axios.post(`${process.env.SMS_API_BASE_URL}/sms/send`, data, {
                        headers: {
                            'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(async (response: any) => {
                        console.log('Sms Success Data', response.data);
                        if (response.data.success) {
                            logs.map((log: any, index: number) => {
                                logs[index].trackingId = response.data.campaign_id;
                                logs[index].municipality = municipality._id;
                            })

                            smsLogs = SmsLog.create(logs);
                            smsLogs.save().then((doc: any) => { }).catch(() => {
                                console.log('error')
                            });
                        }
                    }).catch((error: any) => {
                        console.log(error)
                    })
                }

                if (emails.length !== 0 && doc.notification) {
                    var mailOptions = {
                        from: process.env.MAIL_FROM_ADDRESS,
                        to: emails,
                        subject: doc.title,
                        html: `<div style="width:500px"><h1>${doc.title}</h1><p style="font-size: 16px">${doc.message}</p></div>`,
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
                        console.log('emails sent')
                    });
                }

                notifications.save().then((doc: any) => { }).catch(() => {
                    console.log('error')
                })

            }
        }).catch((err: any) => {
            console.log(err)
            // res.Error("Something Went Wrong");
        })


    }

    async SmsCount(req: express.Request, res: express.Response) {
        let sms: any = await SmsLog.findOne({ trackingId: req.body.trackingId, phoneNo: req.body.phone })
        if (sms != null) {
            if (req.body.status == 'DELIVERED' || req.body.status == 'SENT' || req.body.status == 'FAILED' || req.body.status == 'REJECTED') {
                const temp: any = await Municipality.findById(sms.municipality)
                if (sms.status == 'Queued') {
                    if (req.body.status == 'DELIVERED' || req.body.status == 'SENT') {
                        await Municipality.findByIdAndUpdate(sms.municipality, { smsCount: temp.smsCount + 1, inProgressSms: temp.inProgressSms - 1 })
                    }
                    else { await Municipality.findByIdAndUpdate(sms.municipality, { inProgressSms: temp.inProgressSms - 1 }) }
                }
            }
            await SmsLog.findByIdAndUpdate(sms._id, { status: req.body.status })
        }

        res.Success('sent')
    }


    async DeleteBroadcastMessage(req: express.Request, res: express.Response) {
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        BroadcastMessage.findByIdAndDelete(req.body._id, (err: any) => {
            if (err) return res.Error("Something Went Wrong");
            return res.Success('Broadcast message  Deleted');
        })
    }


}
