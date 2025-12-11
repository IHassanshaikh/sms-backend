import axios from "axios";

async function register() {
    try {
        const response = await axios.post("http://localhost:5000/api/sms/hooks", {
            target_url: "https://5eafd77b70ba.ngrok-free.app/api/sms/webhook",
            event_type: "all"
        });
        console.log("Registered:", response.data);
    } catch (error) {
        console.error("Failed:", error.message);
        if (error.response) console.error(error.response.data);
    }
}

register();
