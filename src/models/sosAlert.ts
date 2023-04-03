import mongoose from 'mongoose';
import { categorySchema } from './category';
import { countrySchema } from './country';

export const municipalitySchema = new mongoose.Schema({
    nameEN: { type: String },
    nameAL: { type: String },
    country: countrySchema,
},
);
export const userSchema = new mongoose.Schema({
    name: { type: String, default: null },
    email: { type: String, default: null },
    phoneNo: { type: String, default: null },
    password: { type: String, default: null },
    category: categorySchema,
    municipality: municipalitySchema,
}
);


const sosAlertSchema = new mongoose.Schema({
    lat: { type: Number },
    lng: { type: Number },
    type: { type: String },
    user: userSchema,
    new: { type: Boolean, default: true }
}, { collection: 'sosAlerts', timestamps: true }
);


const SosAlert = mongoose.model('SosAlert', sosAlertSchema);

export default SosAlert;
