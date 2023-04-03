import mongoose from 'mongoose';
import { locationCategorySchema } from './locationCategory';

const mapPointSchema = new mongoose.Schema({
    lat: {type: Number},
    lng: {type: Number},
    nameEN: {type : String,default: "-"},
    nameAL: {type : String, default: "-"},
    addressEN : {type: String,default: "-"},
    addressAL : {type: String,default: "-"},
    phoneNo: {type: String,default: "-"},
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    municipality: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Municipality",
    },
    category: locationCategorySchema,
}, {
    collection: 'mapPoints'
}
);


const MapPoint = mongoose.model('MapPoint', mapPointSchema);

export default MapPoint;
