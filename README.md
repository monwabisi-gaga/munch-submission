# Twitter Clone API

This project is a simple Twitter-like API built with Node.js, Express, and TypeScript.

---

## How to Run and Test This App in GitHub Codespaces

These instructions are for **all users**, whether you are new to Codespaces or already familiar.

---

### 1. Open the Project in GitHub Codespaces

- On GitHub, click the **Code** button and choose **byte-happiness** or **Create codespace on main** (or your branch).
- Wait for the Codespace to initialize. All dependencies will be installed automatically.

---

### 2. Start the API Server (Use the "Run & Debug" Button)

start the server manually in the terminal by running `npm run dev`

- The server will start on port `5000`.
- You will see a notification or a "Ports" tab showing a forwarded URL like:  
  `https://<your-codespace-id>-5000.app.github.dev`

---

### 3. Get Your API URL

- In the Codespaces window, open the **Ports** tab (bottom panel or via the menu).
- Find the row for port `5000` and copy the **HTTPS** URL.
- This is your API base URL (e.g., `https://<your-codespace-id>-5000.app.github.dev`).

- alternatively you can clone the repo and run:
- `npm install`
- `npm run dev`
- The above commands will start the server on port `5000` on your localhost.


---

### 4. Import the Postman Collection

1. Open [Postman](https://www.postman.com/downloads/) on your local machine.
2. In the Codespace, locate the file:  
   `twitter-clone-api.postman_collection.json`
3. Download this file to your computer (use the Codespaces file browser or right-click and "Download").
4. In Postman, click **Import**, select the file, and import the collection.

---

### 5. Set Up Postman Environment

- In Postman, create a new environment.
- Add a variable called `base_url` and paste your Codespace API URL (from step 3) as its value.
- Make sure this environment is selected before running requests.

---

### 6. Test the API

- Use the requests in the imported collection to register, log in, create tweets, and more.
- The collection will automatically save your authentication token and tweet IDs as you go.
- **Tip:** Start with Register → Login → then try the other endpoints.

---

### 7. Open the API in Your Browser (Optional)

In the Codespace terminal, you can open the API root in your browser with:

```sh
$BROWSER <your-codespace-api-url>
```

Example:

```sh
$BROWSER https://<your-codespace-id>-5000.app.github.dev
```

---

### 8. More Info

- See [`api-test-guide.md`](api-test-guide.md) for detailed endpoint usage and example payloads.
- The API endpoints include:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/tweets`
  - `GET /api/tweets`
  - `GET /api/tweets/timeline`
  - `GET /api/tweets/user/:userId`
  - `PUT /api/tweets/:tweetId`
  - `DELETE /api/tweets/:tweetId`
  - `GET /api/mentions`

---

## Support

For questions, open an issue pop me a mail. 

***Best,
  mo***
