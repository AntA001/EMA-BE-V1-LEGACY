import mongoose from 'mongoose';
import { senderSchema } from './sender';

const newsSchema = new mongoose.Schema({
    titleEN: { type: String },
    titleAL: { type: String },
    descriptionEN: { type: String },
    descriptionAL: { type: String },
    image: { type: String, default: null },
    municipality: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Municipality",
    },
    publisher: senderSchema,
    lastUpdatedBy: senderSchema
}, { timestamps: true }
);


const News = mongoose.model('News', newsSchema);

export default News;
