import mongoose from 'mongoose';

export const authTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    token: { type: String },
}, { collection: "authTokens" }
);


const AuthToken = mongoose.model('AuthToken', authTokenSchema);

export default AuthToken;
