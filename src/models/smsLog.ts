import mongoose from 'mongoose';

const smsLogSchema = new mongoose.Schema({
    broadcastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BroadcastMessage",
    },
    sosAlert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SosAlert",
    },
    municipality: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Municipality",
    },
    trackingId: { type: String },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    status: { type: String, default: "Queued" },
    phoneNo: { type: String }

}, { timestamps: true, collection: "smsLogs" });

const SmsLog = mongoose.model('SmsLog', smsLogSchema);

export default SmsLog;

