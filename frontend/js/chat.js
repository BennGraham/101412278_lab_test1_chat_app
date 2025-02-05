document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const roomTabs = document.getElementById("roomTabs");
  const chatArea = document.getElementById("chatArea");
  const messages = document.getElementById("messages");
  const currentRoomTitle = document.getElementById("currentRoom");
  const messageForm = document.getElementById("messageForm");
  const messageInput = document.getElementById("messageInput");
  let currentRoom = null;

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) {
    window.location.href = "/view/login.html";
    return;
  }

  roomTabs.addEventListener("click", (e) => {
    const tabButton = e.target.closest(".nav-link");
    if (!tabButton) return;

    const room = tabButton.dataset.room;
    if (currentRoom === room) {
      leaveRoom(room);
      tabButton.classList.remove("active");
    } else {
      if (currentRoom) {
        leaveRoom(currentRoom);
      }
      joinRoom(room);
      document.querySelectorAll(".nav-link").forEach((tab) => {
        tab.classList.remove("active");
      });
      tabButton.classList.add("active");
    }
  });

  function joinRoom(room) {
    currentRoom = room;
    socket.emit("joinRoom", room);
    chatArea.classList.remove("d-none");
    currentRoomTitle.textContent = `Current Room: ${room}`;
    messages.innerHTML = "";
  }

  function leaveRoom(room) {
    socket.emit("leaveRoom", room);
    chatArea.classList.add("d-none");
    currentRoomTitle.textContent = "";
    messages.innerHTML = "";
    currentRoom = null;
  }

  socket.on("previousMessages", (previousMessages) => {
    messages.innerHTML = "";
    previousMessages.forEach((msg) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = "mb-2";

      const usernameSpan = document.createElement("span");
      const isCurrentUser = msg.from_user._id === userId;
      usernameSpan.className = isCurrentUser ? "text-primary" : "text-dark";
      usernameSpan.textContent = `${msg.from_user.username}: `;

      const messageText = document.createElement("span");
      messageText.className = "text-dark";
      messageText.textContent = msg.message;

      messageDiv.appendChild(usernameSpan);
      messageDiv.appendChild(messageText);
      messages.appendChild(messageDiv);
    });
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on("message", ({ user, text, userId: messageUserId }) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = "mb-2";

    if (user.toLowerCase() === "system") {
      messageDiv.className = "mb-2 text-danger";
      messageDiv.textContent = `${user}: ${text}`;
    } else {
      const usernameSpan = document.createElement("span");
      const isCurrentUser = messageUserId === userId;
      usernameSpan.className = isCurrentUser ? "text-primary" : "text-dark";
      usernameSpan.textContent = `${user}: `;

      const messageText = document.createElement("span");
      messageText.className = "text-dark";
      messageText.textContent = text;

      messageDiv.appendChild(usernameSpan);
      messageDiv.appendChild(messageText);
    }

    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  });

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message || !currentRoom) return;

    socket.emit("chatMessage", {
      room: currentRoom,
      message,
      userId,
    });
    messageInput.value = "";
  });
});
