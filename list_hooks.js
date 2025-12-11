import axios from "axios";

async function list() {
    try {
        const response = await axios.get("http://localhost:5000/api/sms/hooks");
        console.log("Hooks:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Failed:", error.message);
    }
}

list();
