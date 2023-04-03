import { contactCategorySchema } from './contactCategory';
import mongoose from 'mongoose';

export const contactSchema = new mongoose.Schema({
    titleEN: { type: String },
    titleAL: { type: String },
    contact: { type: String },
    category: contactCategorySchema,
}, { timestamps: true });

export const personalContactSchema = new mongoose.Schema({
    title: { type: String },
    contact: { type: String },
}, { timestamps: true });


export const emergencyContactSchema = new mongoose.Schema({
    titleEN: { type: String },
    titleAL: { type: String },
    contact: { type: String },
    image: { type: String, default: null },
}, { timestamps: true });


const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
