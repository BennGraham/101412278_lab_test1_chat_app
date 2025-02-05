const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("frontend"));

const User = require("./models/User.js");
const GroupMessage = require("./models/GroupMessage.js");
const PrivateMessage = require("./models/PrivateMessage.js");

app.get("/", (_, res) => {
  res.status(201).send("<h1>lab test 1 test</h1>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
