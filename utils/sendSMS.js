import axios from "axios";

export const sendSMS = async (phone, message) => {
    try {
        const response = await axios.post(
            "https://gateway.seven.io/api/sms",
            {
                to: phone,
                text: message,
                from: "447462290295",
                performance_tracking: 1
            },
            {
                headers: {
                    "X-Api-Key": process.env.SEVEN_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "SentWith": "js"
                }
            }
        );

        return { success: true, response: response.data };
    } catch (error) {
        return { success: false, response: error.message };
    }
};
