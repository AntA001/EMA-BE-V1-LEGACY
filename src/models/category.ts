import mongoose from 'mongoose';

export const categorySchema = new mongoose.Schema({
    nameEN: { type: String },
    nameAL: { type: String },
    nameEL: { type: String },
    nameBG: { type: String },
    nameMK: { type: String },
    locked: { type: Boolean, enum: [true, false], default: 'false' },
    password: { type: String, default: null },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
},
);


const Category = mongoose.model('Category', categorySchema);

export default Category;
