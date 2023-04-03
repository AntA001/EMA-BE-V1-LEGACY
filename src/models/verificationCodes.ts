import { userSchema } from './user';
import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema({
    phoneNo: { type: String, required: 'Phone number is required' },
    code: { type: Number },
    expiry: { type: Date },
    type: {
        type: String,
        enum: ['otp', 'reset'],
        default: 'otp'
    },
    user: userSchema
}, { collection: 'verificationCodes' }
);


const VerificationCode = mongoose.model('verificationCode', verificationCodeSchema);

export default VerificationCode;
