document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const roomTabs = document.getElementById("roomTabs");
  const chatArea = document.getElementById("chatArea");
  const messages = document.getElementById("messages");
  const currentRoomTitle = document.getElementById("currentRoom");
  let currentRoom = null;

  const token = localStorage.getItem("token");
  if (!token) {
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
      currentRoom = null;
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
  }

  socket.on("message", ({ user, text }) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = "mb-2";
    messageDiv.textContent = `${user}: ${text}`;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  });
});
