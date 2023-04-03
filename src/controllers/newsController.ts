
import express from "express";
import Joi, { number, ValidationError } from "joi";
import Municipality from '../models/municipality';
import News from '../models/news';
import { dir } from '../../path';
import fs from 'fs';
import multer from 'multer';
import path from 'path';



export class NewsController {
    private static instance: NewsController | null = null;

    private constructor() { }

    static init(): NewsController {
        if (this.instance == null) {
            this.instance = new NewsController();
        }

        return this.instance;
    }

    async NewsImage(req: express.Request, res: express.Response) {
        const dir = path.resolve('./', 'storage', 'images');
        const storagePath = path.resolve('./', 'storage', 'news-images');
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
        const storagePath = path.resolve('./', 'storage', 'news-images');

        let id: any = req.query?.id;
        if (id === '1122') {
            let articles = await News.find();
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


    async NewsDetail(req: express.Request, res: express.Response) {
        let id: any = req.query?.id;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            const row: any = await News.findById(id).select("-image -municipality");
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


    async NewsList(req: express.Request, res: express.Response) {
        const conditions: any = {}
        if (req.auth) {
            conditions["municipality"] = req.auth.municipality._id;
        }
        else {
            res.Error('Something Went Wrong')
            return
        }

        if (req.query?.name) {
            conditions.$or = [{ titleEN: { $regex: req.query.name, $options: "i" } }, { titleAL: { $regex: req.query.name, $options: "i" } }]
        }

        let news: any = await News.find(conditions).sort("-updatedAt").select('-municipality -__v -image');

        // res.Success("News", {
        //     current_page: 1,
        //     from: 1,
        //     to: 1,
        //     per_page: 10,
        //     total: 1,
        //     first_page_url: "",
        //     last_page_url: "",
        //     links: [],
        //     prev_page_url: null,
        //     next_page_url: null,
        //     last_page: 0,
        //     path: "",
        //     data: news
        // })

        res.Success("News", news)

        // res.Success("News", {
        //     from: 0,
        //     to: 0,
        //     per_page: 0,
        //     total: 0,
        //     prev_page_url: null,
        //     next_page_url: null,
        //     last_page: 0,
        //     data: news
        // })

    }


    async AddNews(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'news-images');
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
                    titleEN: Joi.string().max(100).required(),
                    titleAL: Joi.string().max(100).required(),
                    descriptionEN: Joi.string().required(),
                    descriptionAL: Joi.string().required(),
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

                const publisher = {
                    _id: req.auth._id,
                    name: req.auth.name,
                    email: req.auth.email
                }

                const news = await News.create({
                    titleEN: req.body.titleEN,
                    descriptionEN: req.body.descriptionEN,
                    titleAL: req.body.titleAL,
                    descriptionAL: req.body.descriptionAL,
                    image: req.body.image,
                    municipality: municipality,
                    publisher: publisher,
                    lastUpdatedBy: publisher
                })
                await news.save().then((doc: any) => {
                    let news = doc.toObject()
                    delete news.image
                    delete news.municipality
                    delete news.__v
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    res.Success("News Saved", news);
                }).catch(() => {
                    res.Error("Something Went Wrong");
                })
            }
        })
    }

    async DeleteNews(req: express.Request, res: express.Response) {
        const storagePath = path.resolve('./', 'storage', 'news-images');
        const schema = Joi.object().keys({
            _id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
        });
        const { error, value } = schema.validate(req.body);
        if (error instanceof ValidationError) {
            res.Error(error.details[0].message);
            return;
        }

        News.findByIdAndDelete(req.body._id, (err: any) => {
            if (err) return res.Error("Something Went Wrong");
            fs.unlink(storagePath + '/' + req.body._id + '.jpg', (err) => {
                console.log(err);
            })
            return res.Success('News Deleted');
        })
    }


    async UpdateNews(req: express.Request, res: express.Response) {

        const storagePath = path.resolve('./', 'storage', 'news-images');
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
                    descriptionEN: Joi.string().required(),
                    descriptionAL: Joi.string().required(),
                });
                const { error, value } = schema.validate(req.body);
                if (error instanceof ValidationError) {
                    res.Error(error.details[0].message);
                    return;
                }

                let news: any = await News.findOne({ _id: req.body._id })


                const updatedBy = {
                    _id: req.auth._id,
                    name: req.auth.name,
                    email: req.auth.email
                }

                if (news == null) {
                    return res.Error('News Not Found')
                }
                const newsUpdate: any = {
                    titleEN: req.body.titleEN,
                    descriptionEN: req.body.descriptionEN,
                    titleAL: req.body.titleAL,
                    descriptionAL: req.body.descriptionAL,
                    lastUpdatedBy: updatedBy
                }
                News.findByIdAndUpdate(req.body._id, newsUpdate, { new: true }, (err: any, doc: any) => {
                    if (err) return res.Error("Something went wrong", err);
                    if (req.file)
                        fs.renameSync(req.file.path, path.resolve(storagePath, doc._id + '.jpg'));
                    res.Success("News Updated", doc);
                }).select("-image -municipality -__v")
            }
        })
    }
}
