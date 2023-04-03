import mongoose from 'mongoose';

export const senderSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    name: {
        type: String
    },
    email: {
        type: String
    }
}
);
