
import express from "express";
import Joi, { ValidationError } from "joi";
import GuideArticle from "../models/guideArticle";
import multer from 'multer'
import path from 'path';
import fs from 'fs'

export class GuideArticleController {
    private static instance: GuideArticleController | null = null;

    private constructor() { }

    static init(): GuideArticleController {
        if (this.instance == null) {
            this.instance = new GuideArticleController();
        }

        return this.instance;
    }

    async GuideArticleImage(req: express.Request, res: express.Response) {
        const dir = path.resolve('./', 'storage', 'images');
        const storagePath = path.resolve('./', 'storage', 'guide-article-images');
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


    async CopyImagesToStorage(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'guide-article-images');

        let id: any = req.query?.id;
        if (id === '1122') {
            let articles = await GuideArticle.find();
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

    async GuideArticleList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        let selection: string = '-__v -image'

        if (req.auth.userType == "user") {
            conditions.status = 'active'
        }

        if (req.auth.userType == "admin") {
            selection = selection + ' -articleEN -articleAL -articleEL'
        }

        if (req.query?.name) {
            conditions.$or = [{ titleEN: { $regex: req.query.name, $options: "i" } }, { titleAL: { $regex: req.query.name, $options: "i" } }]
        }

        let guideArticle: any = await GuideArticle.find(conditions).sort("-createdAt").select(selection);
        res.Success("guideArticle", guideArticle);
    }


    async AddGuideArticle(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'guide-article-images');
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
                    titleAL: Joi.string(),
                    titleEL: Joi.string(),
                    titleBG: Joi.string(),
                    titleMK: Joi.string(),
                    descriptionEN: Joi.string(),
                    descriptionAL: Joi.string(),
                    descriptionEL: Joi.string(),
                    descriptionBG: Joi.string(),
                    descriptionMK: Joi.string(),
                    articleEN: Joi.string(),
                    articleAL: Joi.string(),
                    articleEL: Joi.string(),
                    articleBG: Joi.string(),
                    articleMK: Joi.string(),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                const guideArticle = await GuideArticle.create({
                    titleEN: req.body.titleEN,
                    titleAL: req.body.titleAL,
                    titleEL: req.body.titleEL,
                    titleBG: req.body.titleBG,
                    titleMK: req.body.titleMK,
                    descriptionEN: req.body.descriptionEN,
                    descriptionAL: req.body.descriptionAL,
                    descriptionEL: req.body.descriptionEL,
                    descriptionBG: req.body.descriptionBG,
                    descriptionMK: req.body.descriptionMK,
                    articleEN: req.body.articleEN,
                    articleAL: req.body.articleAL,
                    articleEL: req.body.articleEL,
                    articleBG: req.body.articleBG,
                    articleMK: req.body.articleMK,
                })

                await guideArticle.save().then((doc: any) => {
                    let guideArticle = doc.toObject()
                    delete guideArticle.image
                    delete guideArticle.__v
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    res.Success("Guide Article Saved", guideArticle);
                }).catch(() => {
                    res.Error("Something Went Wrong");
                })
            }
        });
    }


    async UpdateGuideArticle(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'guide-article-images');
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
                    titleAL: Joi.string(),
                    titleEL: Joi.string(),
                    titleBG: Joi.string(),
                    titleMK: Joi.string(),
                    descriptionEN: Joi.string(),
                    descriptionAL: Joi.string(),
                    descriptionEL: Joi.string(),
                    descriptionBG: Joi.string(),
                    descriptionMK: Joi.string(),
                    articleEN: Joi.string(),
                    articleAL: Joi.string(),
                    articleEL: Joi.string(),
                    articleBG: Joi.string(),
                    articleMK: Joi.string(),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                let guideArticle: any = await GuideArticle.findOne({ _id: req.body._id })

                if (guideArticle == null) {
                    return res.Error('Guide Article Not Found')
                }

                const guideArticleUpdate: any = {
                    titleEN: req.body.titleEN,
                    titleAL: req.body.titleAL,
                    titleEL: req.body.titleEL,
                    titleBG: req.body.titleBG,
                    titleMK: req.body.titleMK,
                    descriptionEN: req.body.descriptionEN,
                    descriptionAL: req.body.descriptionAL,
                    descriptionEL: req.body.descriptionEL,
                    descriptionBG: req.body.descriptionBG,
                    descriptionMK: req.body.descriptionMK,
                    articleEN: req.body.articleEN,
                    articleAL: req.body.articleAL,
                    articleEL: req.body.articleEL,
                    articleBG: req.body.articleBG,
                    articleMK: req.body.articleMK,
                }
                GuideArticle.findByIdAndUpdate(req.body._id, guideArticleUpdate, { new: true }, (err: any, doc: any) => {
                    if (err) return res.Error("Something went wrong", err);
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    res.Success("Guide Article Updated", doc);
                }).select("-image -__v")
            }
        })
    }



    async GuideArticleDetail(req: express.Request, res: express.Response) {
        let id: any = req.query?.id;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            const row: any = await GuideArticle.findById(id).select("-image");
            if (row == null) {
                res.Error('Id not Found');
                return;
            }

            return res.Success("detail", row);

        }
        else {
            res.Error("Id pattern incorrect")
            return
        }
    }


    async DeleteGuideArticle(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'guide-article-images');
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }
        await GuideArticle.findByIdAndDelete({ _id: req.body._id });
        fs.unlink(storagePath + '/' + req.body._id + '.jpg', (err) => {
            console.log(err);
        })
        return res.Success('Guide Article Deleted');
    }

    async UpdateGuideArticleStatus(req: express.Request, res: express.Response) {
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

        GuideArticle.findByIdAndUpdate(req.body._id, {
            status: req.body.status
        }, { new: true }, (err: any, doc: any) => {
            if (err) return res.Error("Something went wrong", err)
            res.Success("Article Status Updated", doc);
        })

    }
}
