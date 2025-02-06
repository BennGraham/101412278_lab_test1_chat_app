require("dotenv").config({ path: ".env.local" });
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const GroupMessage = require("./models/GroupMessage.js");
const PrivateMessage = require("./models/PrivateMessage.js");
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(express.static("frontend"));

mongoose.connect(process.env.MONGODB_URI);

const ROOMS = ["room 1", "room 2", "room 3", "room 4", "room 5"];

app.get("/api/rooms", (_, res) => {
  res.json(ROOMS);
});

io.on("connection", (socket) => {
  socket.on("joinRoom", async (room) => {
    if (ROOMS.includes(room)) {
      Object.keys(socket.rooms).forEach((currentRoom) => {
        if (currentRoom !== socket.id) {
          socket.leave(currentRoom);
        }
      });

      socket.join(room);
      socket.emit("roomJoined", room);

      try {
        console.log("fetching prev messags");
        const previousMessages = await GroupMessage.find({ room })
          .populate("from_user", "username")
          .sort({ date_sent: -1 })
          .limit(50);

        socket.emit("previousMessages", previousMessages.toReversed());

        io.to(room).emit("message", {
          user: "System",
          text: `User joined`,
        });
      } catch (error) {
        console.error("Error loading previous messages:", error);
      }
    }
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    socket.emit("roomLeft", room);
    io.to(room).emit("message", {
      user: "system",
      text: `User left`,
    });
  });

  socket.on("disconnect", () => {
    console.log("disconnected user id: ", socket.id);
  });

  socket.on("chatMessage", async ({ room, message, userId }) => {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const groupMessage = new GroupMessage({
        from_user: userId,
        room,
        message,
      });
      await groupMessage.save();

      io.to(room).emit("message", {
        user: user.username,
        text: message,
        userId: user._id.toString(),
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("typing", async ({ room }) => {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      socket.to(room).emit("userTyping", { user: user.username });
    }
  });

  socket.on("stopTyping", async ({ room }) => {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user) {
      socket.to(room).emit("userStoppedTyping", { user: user.username });
    }
  });

  socket.on("privateMessage", async ({ fromUserId, toUserId, message }) => {
    try {
      const privateMessage = new PrivateMessage({
        from_user: fromUserId,
        to_user: toUserId,
        message,
      });
      await privateMessage.save();

      const populatedMessage = await PrivateMessage.findById(privateMessage._id)
        .populate("from_user", "username")
        .populate("to_user", "username");

      io.emit("newPrivateMessage", populatedMessage);
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  });
});

app.get("/", (_, res) => {
  res.redirect("/view/login.html");
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      firstname,
      lastname,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/private-messages/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const messages = await PrivateMessage.find({
      $or: [{ from_user: userId }, { to_user: userId }],
    })
      .populate("from_user", "username")
      .populate("to_user", "username")
      .sort({ date_sent: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
