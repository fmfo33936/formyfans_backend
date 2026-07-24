// Import all socket event handlers
const chatHandlers = require("./handlers/chatHandlers.js");
// const livekitHandlers = require("./handlers/livekitHandlers.js");

const initializeSocket = (io) => {
  // Handle new connections
  io.on("connection", (socket) => {
    console.info("New connection:", socket.id);

    // Register chat handlers
    chatHandlers(io, socket);

    // Register livekit handlers
    // livekitHandlers(io, socket);

    // Handle disconnection
    socket.on("disconnect", () => {
      console.info("User disconnected:", socket.id);
    });
  });
};

module.exports = {
  initializeSocket,
};
