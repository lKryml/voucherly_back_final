
import app from "./app.js";
import http from "http";

const PORT = 3030;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
