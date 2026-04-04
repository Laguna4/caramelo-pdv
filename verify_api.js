

const apiKey = "AIzaSyDl9IHv2DqM_eQQxemlAMl6snFTl5DX1co";
const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

async function testProvision() {
    console.log("Testing Firebase API...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `test_${Date.now()}@example.com`,
                password: "password123",
                returnSecureToken: true
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error("FAILED: ", data.error.message);
        } else {
            console.log("SUCCESS: User created.");
        }
    } catch (error) {
        console.error("Network/Script Error:", error);
    }
}

testProvision();
