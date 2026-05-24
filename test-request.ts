import dotenv from "dotenv";
dotenv.config();

async function test() {
  const token = "user1"; // Just arbitrary uid
  const res = await fetch("http://localhost:3000/api/chatbot/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query: "Hello", userTier: "magnate" })
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
test();
