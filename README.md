# 🎬 YouTube Watch Party

A modern, real-time synchronized Watch Party web application built for seamless group viewing experiences with Role-Based Access Control (RBAC).

## 🚀 Features
- **Real-Time Synchronization**: Synchronized play, pause, scrubbing/seeking, and video switching across all participants in a room using WebSockets.
- **Room-Based Architecture**: Create or join custom rooms instantly via unique room IDs/links.
- **Role-Based Access Control (RBAC)**: 
  - **Host**: Full administrative control (play/pause, seek, change video, assign roles, remove participants).
  - **Moderator**: Play, pause, seek, and change video permissions.
  - **Participant**: View-only mode with a clean, restricted interface.
- **Robust YouTube Integration**: Supports standard watch URLs, short links (`youtu.be`), and embedded formats with automatic 11-character Video ID extraction.
- **Sleek Dark-Themed UI**: Built with React, Vite, and Tailwind CSS featuring glassmorphism and modern styling.

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, `react-youtube`, `socket.io-client`
- **Backend**: Node.js, Express, `socket.io`
- **Real-Time Communication**: WebSockets (Socket.IO)

---

## ⚙️ Local Setup & Installation

### Prerequisites
Make sure you have **Node.js** installed on your system.

### 1. Clone or Download the Repository
```bash
git clone <your-repository-url>
cd "Youtube watch party"