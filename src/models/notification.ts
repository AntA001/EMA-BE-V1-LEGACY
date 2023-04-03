import { broadcastMessageSchema } from './broadcastMessage';
import mongoose from 'mongoose';
import { string } from 'joi';

const municipalitySchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Municipality",
    },
    nameEN: {
        type: String
    },
    nameAL: {
        type: String
    }
}
);

const notificationSchema = new mongoose.Schema({
    broadcastMessage: broadcastMessageSchema,
    sosAlert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SosAlert",
    },
    municipality: municipalitySchema,
    sosAlertMsg: { type: String },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: "User is required!",
        ref: "User",
    },
    isRead: { type: Boolean, default: false }

}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

