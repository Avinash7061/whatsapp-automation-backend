"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTextMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const INTERAKT_API_KEY = process.env.INTERAKT_API_KEY || '';
const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public';
const apiClient = axios_1.default.create({
    baseURL: INTERAKT_API_URL,
    headers: {
        'Authorization': `Basic ${INTERAKT_API_KEY}`,
        'Content-Type': 'application/json'
    }
});
const sendTextMessage = async (phoneNumber, message) => {
    try {
        // Basic phone number cleaning (assuming mostly Indian numbers for now)
        let countryCode = '+91';
        let cleanNumber = phoneNumber;
        if (phoneNumber.startsWith('+91')) {
            cleanNumber = phoneNumber.substring(3);
        }
        else if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
            cleanNumber = phoneNumber.substring(2);
        }
        const response = await apiClient.post('/message/', {
            countryCode: countryCode,
            phoneNumber: cleanNumber,
            type: 'chat',
            message: {
                type: 'text',
                text: message
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error sending Interakt message:', error.response?.data || error.message);
        throw error;
    }
};
exports.sendTextMessage = sendTextMessage;
