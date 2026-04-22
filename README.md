# PeerStack

PeerStack is a host-ready peer review platform where users can:

- register and login
- upload projects with project name, GitHub link, and short description
- comment on projects
- rate projects with 1 to 5 stars
- follow and unfollow other users
- search both profiles and projects

## Tech stack

- Node.js
- Express
- MongoDB with Mongoose
- Vanilla HTML, CSS, and JavaScript frontend

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string and a strong JWT secret.

4. Start MongoDB locally, or use MongoDB Atlas.

5. Run the app:

```bash
npm run dev
```

6. Open [http://localhost:5000](http://localhost:5000)

## Environment variables

- `PORT`: server port, defaults to `5000`
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: secret for signing login tokens

## Ready to host

This app is ready for platforms such as Render, Railway, or a VPS.

Typical production settings:

- build command: `npm install`
- start command: `npm start`
- environment variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `PORT`

## Notes

- Authentication uses JWT stored in browser local storage.
- The backend serves the frontend from the `public` folder.
- Project and user search use MongoDB-backed queries.

## Share with friends using Render and MongoDB Atlas

This is the fastest way to put PeerStack online and share it with your friends.

### 1. Put the project on GitHub

Create a new GitHub repository and upload this folder.

Example:

```bash
git init
git add .
git commit -m "Initial PeerStack app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/peerstack.git
git push -u origin main
```

### 2. Create a MongoDB Atlas database

1. Go to MongoDB Atlas
2. Create a free cluster
3. Create a database user
4. Allow access from everywhere for now with `0.0.0.0/0`
5. Copy your connection string

It will look something like:

```txt
mongodb+srv://USERNAME:PASSWORD@cluster-name.mongodb.net/peerstack?retryWrites=true&w=majority
```

Replace:

- `USERNAME` with your Atlas database username
- `PASSWORD` with your Atlas database password

### 3. Deploy on Render

1. Go to Render
2. Click `New +`
3. Choose `Web Service`
4. Connect your GitHub repository
5. Render should detect the app automatically

Use these settings:

- Build Command: `npm install`
- Start Command: `npm start`

Add these environment variables:

- `MONGODB_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = any long random secret string

You do not need to set `PORT` on Render because Render provides it automatically.

### 4. Open your live URL

After deploy finishes, Render gives you a public URL like:

```txt
https://peerstack.onrender.com
```

Send that URL to your friend and they can use the app.

## Render blueprint option

This repo includes [render.yaml](/Users/aaryankhan/Documents/peerStack/render.yaml), so Render can also read the service configuration automatically.

You still need to manually set:

- `MONGODB_URI`
- `JWT_SECRET`

## Before sharing

For first public testing:

- register your own account
- upload one or two projects
- search for profiles from Explore
- follow another account
- test comments and ratings

## Future upgrade ideas

If you want, the next step I can do is:

- add profile pictures
- add project images/thumbnails
- add edit/delete project
- add real notifications
- convert this into an Android app shell
