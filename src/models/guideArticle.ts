import mongoose from 'mongoose';

const guideArticleSchema = new mongoose.Schema({
    titleEN: { type: String },
    titleAL: { type: String },
    titleEL: { type: String },
    titleBG: { type: String },
    titleMK: { type: String },
    descriptionEN: { type: String },
    descriptionAL: { type: String },
    descriptionEL: { type: String },
    descriptionBG: { type: String },
    descriptionMK: { type: String },
    image: { type: String },
    articleEN: { type: String },
    articleAL: { type: String },
    articleEL: { type: String },
    articleBG: { type: String },
    articleMK: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { collection: 'guideArticles', timestamps: true }
);


const GuideArticle = mongoose.model('GuideArticle', guideArticleSchema);

export default GuideArticle;
