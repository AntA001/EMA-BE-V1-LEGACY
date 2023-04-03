
import mongoose from 'mongoose';

export const contactCategorySchema = new mongoose.Schema({
    nameEN: { type: String },
    nameAL: { type: String },
    nameEL: { type: String },
    nameBG: { type: String },
    nameMK: { type: String },
    color: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    defaultCategory: {
        type: Boolean,
        default: false
    }
}, { collection: 'contactCategories', timestamps: true });


const ContactCategory = mongoose.model('ContactCategory', contactCategorySchema);

export default ContactCategory;
