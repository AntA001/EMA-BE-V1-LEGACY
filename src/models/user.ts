import { municipalitySchema } from './municipality';
import { categorySchema } from './category';
import mongoose from 'mongoose';
import { personalContactSchema } from './contact';


const municipalAdminTypeSchema = new mongoose.Schema({
    type: {
        type: String,
    },
    label: {
        type: String
    },
});

export const userSchema = new mongoose.Schema({
    name: { type: String, default: null },
    email: { type: String, default: null },
    phoneNo: { type: String, default: null },
    password: { type: String, default: null },
    image: { type: String },
    category: categorySchema,
    municipality: municipalitySchema,
    userType: {
        type: String,
        enum: ['admin', 'municipal-admin', 'user'],
        default: 'user'
    },
    municipalAdminType: { type: String, default: null },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    fcmToken: { type: String, default: null },
    step: { type: Number },
    personalEmergencyContacts: [personalContactSchema],
    lastLogin: { type: Date }
}, { timestamps: true }
);


const User = mongoose.model('User', userSchema);

export default User;
