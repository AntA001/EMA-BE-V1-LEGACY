import mongoose from 'mongoose';

export const locationCategorySchema = new mongoose.Schema({
    nameEN: { type: String },
    nameAL: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
},
{collection: "locationCategories"}
);


const LocationCategory = mongoose.model('LocationCategory', locationCategorySchema);

export default LocationCategory;
