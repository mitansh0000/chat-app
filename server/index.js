const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
mongoose.connect('mongodb+srv://mitansh:mitansh@cluster0.aexjlg8.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define MongoDB Schema and Model for Chat Messages
const chatSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const ChatMessage = mongoose.model('ChatMessage', chatSchema);

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Serve static files (e.g., HTML, CSS, JavaScript)
app.use(express.static(path.join(__dirname, '../client/public')));

// Parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the socket.io.js file (if needed)
app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
});

// Handle Socket.io connections and events
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send existing chat messages to the newly connected user
// Find all messages (change 'Message' to your actual model name)
 ChatMessage.find({})
  .then((messages) => {
    socket.emit('chat history', messages);
  })
  .catch((err) => {
    console.error('Error fetching messages:', err);
  });


  // Handle chat messages from connected clients
  socket.on('chat message', (message) => {
    console.log('Message received:', message);

    // Broadcast the message to all connected clients
    io.emit('chat message', message);

    // Save the chat message to MongoDB
    const chatMessage = new ChatMessage(message);
    // Save a new message (change 'Message' to your actual model name)
chatMessage.save()
.then(() => {
  // Handle successful save
})
.catch((err) => {
  console.error('Error saving message:', err);
});

  });


  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Handle File Uploads
app.post('/upload', upload.single('file'), (req, res) => {
  // Handle the uploaded file here
  const file = req.file;
  // Respond with a success message or handle errors
  res.json({ message: 'File uploaded successfully', filename: file.filename });
});

// Handle Chat Messages via HTTP POST
app.post('/send-message', (req, res) => {
  const { username, message } = req.body;
  if (!username || !message) {
    return res.status(400).json({ error: 'Username and message are required' });
  }

  // Save the chat message to MongoDB
  const chatMessage = new ChatMessage({ username, message });
  chatMessage.save((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to save message' });
    }
    // Broadcast the message to all connected clients
    io.emit('chat message', chatMessage);
    res.json({ message: 'Message sent successfully' });
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
