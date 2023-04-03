import mongoose from 'mongoose';

export const countrySchema = new mongoose.Schema({
    nameEN: { type: String },
    nameAL: { type: String },
    nativeLanguage: {
        code: { type: String },
        name: { type: String }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
},
);


const Country = mongoose.model('Country', countrySchema);

export default Country;
