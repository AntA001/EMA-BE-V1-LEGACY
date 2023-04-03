import mongoose from 'mongoose';
import { senderSchema } from './sender';
import { categorySchema } from './category';




export const broadcastMessageSchema = new mongoose.Schema({
    category: categorySchema,
    title: { type: String },
    message: { type: String },
    notification: { type: Boolean },
    sms: { type: Boolean },
    template: { type: Boolean },
    municipality: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Municipality",
    },
    sender: senderSchema
}, { collection: 'broadcastMessages', timestamps: true }
);




const BroadcastMessage = mongoose.model('BroadcastMessage', broadcastMessageSchema);

export default BroadcastMessage;
