import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const INTERAKT_API_KEY = process.env.INTERAKT_API_KEY || '';
const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public';

const apiClient = axios.create({
  baseURL: INTERAKT_API_URL,
  headers: {
    'Authorization': `Basic ${INTERAKT_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

export const sendTextMessage = async (phoneNumber: string, message: string) => {
  try {
    let cleanNumber = phoneNumber;
    if (phoneNumber.startsWith('+91')) {
      cleanNumber = phoneNumber.substring(3);
    } else if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
      cleanNumber = phoneNumber.substring(2);
    }
    
    const response = await apiClient.post('/message/', {
      countryCode: '+91',
      phoneNumber: cleanNumber, 
      type: 'chat',
      message: {
        type: 'text',
        text: message
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error sending Interakt message:', error.response?.data || error.message);
    throw error;
  }
};

export const sendTemplateMessage = async (phoneNumber: string, templateName: string, languageCode: string = 'en', bodyValues: string[] = []) => {
  try {
    let cleanNumber = phoneNumber;
    if (phoneNumber.startsWith('+91')) cleanNumber = phoneNumber.substring(3);
    else if (phoneNumber.startsWith('91') && phoneNumber.length === 12) cleanNumber = phoneNumber.substring(2);

    const response = await apiClient.post('/message/', {
      countryCode: '+91',
      phoneNumber: cleanNumber,
      type: 'Template',
      template: {
        name: templateName,
        languageCode: languageCode,
        bodyValues: bodyValues
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error sending Interakt template message:', error.response?.data || error.message);
    throw error;
  }
};
