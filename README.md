# SusunSoal

A web-based quiz/tryout management platform designed for seamless question creation, quiz attempts, and result tracking. Built with **Next.js** and **TailwindCSS** on the frontend, and powered by a **MongoDB + Express.js** backend. 
Additionally, **Agenda.js** is used for **auto-submitting quizzes**, and **Passport.js** is used for **Google OAuth 2.0 authentication**.

---

## Live Website
- **[SusunSoal](https://susunsoal.vercel.app/)**
Notes: Performance may be inconsistent due to limitations of free server resources.
---

## Tech Stack
### **Frontend**
- Next.js
- TailwindCSS

### **Backend**
- Node.js + Express.js
- MongoDB
- Agenda.js (for auto-submitting quizzes)
- Passport.js (for Google OAuth 2.0)
- Swagger (for API Documentation)

---

## Repository Structure
- **Frontend**: [susunsoal-frontend](https://github.com/kevincornellius/susunsoal-frontend)
- **Backend**: [susunsoal-backend](https://github.com/kevincornellius/susunsoal-backend)

---

## Running Locally
### **Prerequisites**
Ensure you have the following installed:
- **Node.js** (>= 16.x)
- **Needed API Keys [See point 5]**

### **1. Clone the Repositories**
```sh
git clone https://github.com/kevincornellius/susunsoal-frontend.git
```
```sh
git clone https://github.com/kevincornellius/susunsoal-backend.git
```

### **2. Set Up Environment Variables**
Create a `.env` file in both `frontend/` and `backend/` folders.

#### **Frontend (`frontend/.env.local`)**
```
NEXT_PUBLIC_BACKEND_URL=[Backend URL]
```

#### **Backend (`backend/.env`)**
```
SUPER_SECRET_KEY=[EXPRESS SESSION KEY / ANY]
MONGO_URI=[MongoDB connection key]
FRONTEND_URL=[Frontend URL]
BACKEND_URL=[Backend URL]
GOOGLE_CLIENT_ID=[Google Cloud Console Key]
GOOGLE_CLIENT_SECRET=[Google Cloud Console Key]
JWT_SECRET=[JWT SECRET KEY / ANY]
```

Feel free to modify how you structure your environment variable files, but ensure that all the required values above are provided.

### **3. Install Dependencies**
#### **Frontend**
```sh
cd susunsoal-frontend
npm install
```

#### **Backend**
```sh
cd susunsoal-backend
npm install
```

### **4. Start the Application**
#### **Backend**
```sh
cd susunsoal-backend
node server.js
```
- Swagger API docs available at `http://localhost:5000/api-docs` (does not exist in the deployment because Vercel deployment is serverless).

#### **Frontend**
```sh
cd susunsoal-frontend
npm run dev
```

---

## **5. How to Obtain API Keys**

### **1. MongoDB Connection String**
- Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/signup) or use a local MongoDB instance.
- Create a cluster and database.
- Go to **Database Access** > Add a new user.
- Copy the connection string and replace `<password>` with your actual password.

### **2. Google OAuth Credentials**
- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a new project.
- Navigate to **APIs & Services** > **Credentials**.
- Click **Create Credentials** > **OAuth 2.0 Client IDs**.
- Configure consent screen and set redirect URIs to:
  - `http://localhost:5000/auth/google/callback` (for local dev)
- Copy the `Client ID` and `Client Secret`.

---

