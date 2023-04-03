import { contactSchema, emergencyContactSchema } from './contact';
import { countrySchema } from './country';
import mongoose from 'mongoose';
import { locationCategorySchema } from './locationCategory';

export const municipalitySchema = new mongoose.Schema({
    nameEN: { type: String },
    nameAL: { type: String },
    country: countrySchema,
    maxSmsCount: { type: Number },
    smsCount: { type: Number, default: 0 },
    inProgressSms: { type: Number, default: 0 },
    facebookLink: { type: String, default: null },
    twitterLink: { type: String, default: null },
    webLink: { type: String, default: null },
    instagramLink: { type: String, default: null },
    youtubeLink: { type: String, default: null },
    usefulContacts: [contactSchema],
    emergencyContacts: [emergencyContactSchema],
    locationCategories: [locationCategorySchema],
    logo: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
}, { timestamps: true }
);


const Municipality = mongoose.model('Municipality', municipalitySchema);

export default Municipality;
